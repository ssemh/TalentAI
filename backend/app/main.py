import asyncio
import base64
import io
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

GITHUB_API_URL = "https://api.github.com"
# backend/.env içinden de okunur (varsa)
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

MAX_README_CHARS = int(os.getenv("MAX_README_CHARS", "20000"))
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234/v1").rstrip("/")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "local-model")


def _github_token() -> Optional[str]:
    raw = os.getenv("GITHUB_TOKEN", "")
    if not raw:
        return None
    token = raw.strip().strip('"').strip("'")
    return token or None


def _github_headers() -> Dict[str, str]:
    headers: Dict[str, str] = {"Accept": "application/vnd.github+json"}
    token = _github_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _decode_github_readme(content_b64: str) -> str:
    # GitHub encodes README content as base64.
    raw = base64.b64decode(content_b64)
    return raw.decode("utf-8", errors="replace")


async def _safe_get_json(client: httpx.AsyncClient, url: str) -> Optional[Any]:
    try:
        resp = await client.get(url)
    except httpx.HTTPError:
        return None
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


async def _fetch_repo_bundle(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    owner: str,
    repo_name: str,
    full_readme: bool,
) -> Dict[str, Any]:
    async with semaphore:
        languages_url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/languages"
        readme_url = f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/readme"

        languages_data: Dict[str, int] = {}
        languages_json = await _safe_get_json(client, languages_url)
        if isinstance(languages_json, dict):
            # { "Python": 12345, "TypeScript": 23456, ... }
            languages_data = {str(k): int(v) for k, v in languages_json.items() if isinstance(v, int)}

        readme_text: Optional[str] = None
        readme_truncated = False
        readme_json = await _safe_get_json(client, readme_url)
        if full_readme and isinstance(readme_json, dict):
            content_b64 = readme_json.get("content")
            if isinstance(content_b64, str):
                readme_text = _decode_github_readme(content_b64)
                if MAX_README_CHARS > 0 and len(readme_text) > MAX_README_CHARS:
                    readme_text = readme_text[:MAX_README_CHARS]
                    readme_truncated = True

        return {
            "name": repo_name,
            "languages": languages_data,
            "readme": readme_text,
            "readme_truncated": readme_truncated,
        }


async def _fetch_github_repos(username: str) -> List[Dict[str, Any]]:
    username = username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="GitHub username boş olamaz.")

    async with httpx.AsyncClient(timeout=30.0, headers=_github_headers()) as client:
        repos_url = f"{GITHUB_API_URL}/users/{username}/repos?per_page=100&type=owner"
        repos_resp = await client.get(repos_url)

        if repos_resp.status_code == 404:
            raise HTTPException(status_code=404, detail="GitHub kullanıcı adı bulunamadı.")

        try:
            repos_resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if repos_resp.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail=(
                        "GitHub 401: GITHUB_TOKEN geçersiz, süresi dolmuş veya izinleri yetersiz. "
                        "Yeni bir PAT oluşturun (classic: public_repo okuma; fine-grained: Contents: Read public), "
                        "PowerShell'de tırnak kullanmadan ayarlayın ve uvicorn'u yeniden başlatın."
                    ),
                ) from exc
            if repos_resp.status_code == 403:
                body = repos_resp.text or ""
                if "rate limit" in body.lower():
                    raise HTTPException(
                        status_code=429,
                        detail="GitHub API rate limit aşıldı. Geçerli GITHUB_TOKEN kullanın.",
                    ) from exc
                raise HTTPException(
                    status_code=502,
                    detail="GitHub 403: Erişim reddedildi (private repo veya token izni yetersiz olabilir).",
                ) from exc
            raise HTTPException(
                status_code=502,
                detail=f"GitHub API hatası: {repos_resp.status_code}",
            ) from exc
        repos = repos_resp.json()

        if not isinstance(repos, list):
            raise HTTPException(status_code=502, detail="GitHub API beklenmeyen format döndürdü.")

        owner = username
        semaphore = asyncio.Semaphore(8)
        full_readme = os.getenv("INCLUDE_README", "true").lower() in ("1", "true", "yes", "y")

        tasks = [
            _fetch_repo_bundle(
                client=client,
                semaphore=semaphore,
                owner=owner,
                repo_name=repo.get("name"),
                full_readme=full_readme,
            )
            for repo in repos
            if isinstance(repo, dict) and isinstance(repo.get("name"), str)
        ]

        bundles = await asyncio.gather(*tasks, return_exceptions=True)
        results: List[Dict[str, Any]] = []
        for b in bundles:
            if isinstance(b, Exception):
                continue
            results.append(b)
        return results


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1)


class LMStudioChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(min_length=1)
    temperature: float = Field(default=0.4, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=1, le=4096)


class LMStudioChatResponse(BaseModel):
    model: str
    reply: str
    usage: Optional[Dict[str, Any]] = None


class GithubAnalysisResponse(BaseModel):
    username: str
    repo_count: int
    analysis: str
    model: str


def _extract_lm_studio_text(message: Dict[str, Any]) -> str:
    # LM Studio / OpenAI uyumlu yanıtlar modele göre farklı alanlar döndürebilir.
    raw_content = message.get("content")
    if isinstance(raw_content, str) and raw_content.strip():
        return raw_content.strip()

    if isinstance(raw_content, list):
        parts: List[str] = []
        for item in raw_content:
            if isinstance(item, dict) and item.get("type") == "text":
                txt = item.get("text")
                if isinstance(txt, str) and txt.strip():
                    parts.append(txt.strip())
        if parts:
            return "\n".join(parts)

    reasoning = message.get("reasoning_content")
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning.strip()

    alt_text = message.get("text")
    if isinstance(alt_text, str) and alt_text.strip():
        return alt_text.strip()

    return ""


async def _lm_studio_chat(payload: LMStudioChatRequest) -> LMStudioChatResponse:
    url = f"{LM_STUDIO_BASE_URL}/chat/completions"
    body = {
        "model": LM_STUDIO_MODEL,
        "messages": [m.model_dump() for m in payload.messages],
        "temperature": payload.temperature,
        "max_tokens": payload.max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LM Studio'ya bağlanılamadı: {str(exc)}",
        ) from exc

    if resp.status_code >= 400:
        detail = resp.text[:500] if resp.text else f"status={resp.status_code}"
        raise HTTPException(status_code=502, detail=f"LM Studio hata döndürdü: {detail}")

    data = resp.json()
    choices = data.get("choices") if isinstance(data, dict) else None
    if not isinstance(choices, list) or not choices:
        raise HTTPException(status_code=502, detail="LM Studio yanıtı beklenmeyen formatta.")

    first_choice = choices[0] if isinstance(choices[0], dict) else {}
    message = first_choice.get("message") if isinstance(first_choice, dict) else {}
    content = _extract_lm_studio_text(message if isinstance(message, dict) else {})
    if not content:
        raise HTTPException(
            status_code=502,
            detail=(
                "LM Studio boş yanıt döndürdü. Model adını kontrol edin veya LM Studio'da "
                "'Respond with content' benzeri ayarı etkinleştirin."
            ),
        )

    return LMStudioChatResponse(
        model=str(data.get("model", LM_STUDIO_MODEL)),
        reply=content,
        usage=data.get("usage") if isinstance(data, dict) else None,
    )


def _build_repo_context(repos: List[Dict[str, Any]], max_repos: int = 20) -> str:
    lines: List[str] = []
    for repo in repos[:max_repos]:
        name = str(repo.get("name", "")).strip()
        if not name:
            continue
        languages = repo.get("languages") if isinstance(repo.get("languages"), dict) else {}
        top_langs = sorted(
            [(k, v) for k, v in languages.items() if isinstance(k, str) and isinstance(v, int)],
            key=lambda item: item[1],
            reverse=True,
        )[:3]
        langs_text = ", ".join([lang for lang, _ in top_langs]) if top_langs else "bilinmiyor"

        readme = repo.get("readme")
        truncated = bool(repo.get("readme_truncated"))
        snippet = ""
        if isinstance(readme, str) and readme.strip():
            one_line = " ".join(readme.strip().split())
            snippet = one_line[:240]
            if truncated:
                snippet = f"{snippet}… (readme kısaltıldı)"
        lines.append(f"- {name} | diller: {langs_text} | readme: {snippet or '-'}")
    return "\n".join(lines)


async def _analyze_github_profile_with_ai(username: str, repos: List[Dict[str, Any]]) -> GithubAnalysisResponse:
    repo_context = _build_repo_context(repos)
    try:
        analysis_temp = float(os.getenv("ANALYSIS_TEMPERATURE", "0.25"))
    except ValueError:
        analysis_temp = 0.25
    try:
        analysis_max = int(os.getenv("ANALYSIS_MAX_TOKENS", "1024"))
    except ValueError:
        analysis_max = 1024
    messages = [
        ChatMessage(
            role="system",
            content=(
                "Sen bir İK / teknik değerlendirme asistanısın. SADECE aşağıda verilen GitHub verisi "
                "(repo adları, dil istatistikleri, README özetleri) üzerinden Türkçe yaz.\n\n"
                "Kurallar (mutlaka uy):\n"
                "- Sadece veride görünenlere dayan; tahmin veya varsayım yapma. Emin değilsen açıkça "
                "'veri yetersiz' de.\n"
                "- Kişisel özellik, sağlık, psikoloji, yaş, cinsiyet, etnik köken, din, siyasi görüş, "
                "medeni hal veya 'zekâ/personel tipi' gibi nitelendirmeler yapma.\n"
                "- Ayrımcı, hakaret içeren veya yasal riskli ifadeler kullanma; nötr ve profesyonel dil kullan.\n"
                "- Tek bir repo/README satırını abartma; genel eğilimi özetle.\n"
                "- Kod kalitesi hakkında kesin hüküm verme (kod tam görünmüyor); 'olası ipuçları' şeklinde yaz.\n"
                "- Markdown veya JSON kullanma; düz metin ve başlıklar yeterli.\n\n"
                "Çıktı kalitesi: net başlıklar, madde işaretleri, işe alım / teknik mülakatta kullanılabilir özet."
            ),
        ),
        ChatMessage(
            role="user",
            content=(
                f"GitHub kullanıcı adı: @{username}\n"
                f"Verilen repo sayısı (işlenen örnek): {len(repos)}\n\n"
                "Repo özeti (sadece buna güven):\n"
                f"{repo_context if repo_context else '- Verilen listede özetlenecek repo yok -'}\n\n"
                "Aşağıdaki başlıklarla cevap ver (her bölümde 3–6 madde, gereksiz tekrar yok):\n\n"
                "Özet\n"
                "- Tek paragrafta teknik profil özeti (yalnızca veriye dayalı).\n\n"
                "Güçlü sinyaller\n"
                "- Repo/dil/README’den çıkarılabilen olumlu göstergeler.\n\n"
                "Belirsizlikler ve veri boşlukları\n"
                "- Eksik README, tek repo, dil bilgisi yok vb. neyi bilemediğimizi yaz.\n\n"
                "Olası rol / teknoloji uyumu\n"
                "- 'Muhtemel uyum' diye dikkatli öner; kesin işe alım kararı verme.\n\n"
                "Mülakat için sorulacak net sorular\n"
                "- En az 4 soru; her biri belirli bir repo veya dil çizgisine bağlansın.\n\n"
                "Gelişim önerileri (aday için nötr)\n"
                "- En az 3 somut, profesyonel öneri (davranış yargısı değil)."
            ),
        ),
    ]

    ai_resp = await _lm_studio_chat(
        LMStudioChatRequest(
            messages=messages,
            temperature=max(0.0, min(2.0, analysis_temp)),
            max_tokens=max(256, min(4096, analysis_max)),
        )
    )
    return GithubAnalysisResponse(
        username=username,
        repo_count=len(repos),
        analysis=ai_resp.reply,
        model=ai_resp.model,
    )


def _try_register_dejavu_font() -> None:
    # Windows'ta genelde mevcut: Türkçe karakter desteği için.
    # Yoksa default font ile devam ederiz.
    candidates = [
        r"C:\Windows\Fonts\DejaVuSans.ttf",
        r"C:\Windows\Fonts\Arial.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont("TalentAIFont", path))
                return
            except Exception:
                continue


def _build_cv_pdf(username: str, repos: List[Dict[str, Any]]) -> io.BytesIO:
    _try_register_dejavu_font()
    font_name = "TalentAIFont" if "TalentAIFont" in pdfmetrics.getRegisteredFontNames() else "Helvetica"

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    left = 2 * cm
    top = height - 2 * cm
    y = top

    def line(text: str, size: int = 11, gap: float = 14) -> None:
        nonlocal y
        c.setFont(font_name, size)
        c.drawString(left, y, text)
        y -= gap

    def hr(gap: float = 10) -> None:
        nonlocal y
        c.setLineWidth(0.6)
        c.setStrokeColorRGB(0.6, 0.6, 0.6)
        c.line(left, y, width - left, y)
        y -= gap

    # Header
    line("TalentAI - Otomatik CV (MVP)", size=16, gap=20)
    line(f"GitHub: @{username}", size=12, gap=16)
    created = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    line(f"Oluşturulma: {created}", size=10, gap=14)
    hr(16)

    # Summary
    line("Proje Özeti", size=13, gap=18)
    line(f"Toplam repo: {len(repos)}", size=11, gap=14)
    hr(14)

    # Repos
    line("Repo Listesi (isim / top diller / README özeti)", size=12, gap=18)

    def wrap_text(txt: str, max_chars: int = 95) -> List[str]:
        words = (txt or "").replace("\r", "").split()
        out: List[str] = []
        cur = ""
        for w in words:
            if len(cur) + len(w) + 1 <= max_chars:
                cur = (cur + " " + w).strip()
            else:
                if cur:
                    out.append(cur)
                cur = w
        if cur:
            out.append(cur)
        return out

    for repo in repos[:30]:
        if y < 3 * cm:
            c.showPage()
            y = top

        name = str(repo.get("name", ""))
        languages = repo.get("languages") if isinstance(repo.get("languages"), dict) else {}
        lang_sorted = sorted(languages.items(), key=lambda kv: kv[1], reverse=True)[:3]
        lang_str = ", ".join([k for k, _ in lang_sorted]) if lang_sorted else "-"

        readme = repo.get("readme")
        readme_text = readme if isinstance(readme, str) else ""
        snippet = readme_text.strip().splitlines()[0:3]
        snippet_text = " ".join([s.strip() for s in snippet if s.strip()])
        if len(snippet_text) > 220:
            snippet_text = snippet_text[:220].rstrip() + "…"

        line(f"- {name}", size=11, gap=14)
        line(f"  Diller: {lang_str}", size=10, gap=12)
        if snippet_text:
            for wline in wrap_text(f"  README: {snippet_text}", max_chars=92)[:3]:
                line(wline, size=9, gap=11)
        y -= 6

    c.showPage()
    c.save()
    buf.seek(0)
    return buf


app = FastAPI(title="TalentAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/github/{username}")
async def get_github_repos(username: str) -> List[Dict[str, Any]]:
    return await _fetch_github_repos(username)


@app.get("/api/github/analyze/{username}", response_model=GithubAnalysisResponse)
async def analyze_github_profile(username: str) -> GithubAnalysisResponse:
    repos = await _fetch_github_repos(username)
    return await _analyze_github_profile_with_ai(username=username.strip(), repos=repos)


@app.post("/api/ai/chat", response_model=LMStudioChatResponse)
async def ai_chat(payload: LMStudioChatRequest) -> LMStudioChatResponse:
    return await _lm_studio_chat(payload)


@app.get("/api/cv/github/{username}")
async def generate_cv_from_github(username: str) -> StreamingResponse:
    repos = await _fetch_github_repos(username)
    pdf_buf = _build_cv_pdf(username=username.strip(), repos=repos)
    filename = f"TalentAI_CV_{username.strip()}.pdf"
    return StreamingResponse(
        pdf_buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

