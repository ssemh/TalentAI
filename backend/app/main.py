import asyncio
import base64
import io
import json
import os
import random
import re
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
CV_TEXT_MAX_CHARS = int(os.getenv("CV_TEXT_MAX_CHARS", "24000"))
LM_STUDIO_BASE_URL = os.getenv("LM_STUDIO_BASE_URL", "http://127.0.0.1:1234/v1").rstrip("/")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "local-model")

_CV_DIM_KEYS = (
    "structure_clarity",
    "impact_and_results",
    "skills_depth",
    "professional_tone",
)


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
    # OpenAI uyumlu: bazı sunucular destekler; desteklemezse otomatik yeniden dene.
    response_json_object: bool = False


class LMStudioChatResponse(BaseModel):
    model: str
    reply: str
    usage: Optional[Dict[str, Any]] = None
    # Skor JSON ayrıştırması: content + reasoning birleşimi (sanitize edilmemiş).
    raw_for_json_parse: Optional[str] = None


class GithubAnalysisResponse(BaseModel):
    username: str
    repo_count: int
    analysis: str
    model: str


class InterviewStartResponse(BaseModel):
    username: str
    opener: str
    first_question: str
    model: str


class InterviewTurnRequest(BaseModel):
    username: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    history: List[ChatMessage] = Field(default_factory=list)


class InterviewTurnResponse(BaseModel):
    username: str
    feedback: str
    next_question: str
    model: str
    interview_ended: bool = False


class ProfileScoreResponse(BaseModel):
    username: str
    github_score: int
    cv_readiness_score: int
    github_score_baseline: int
    cv_readiness_score_baseline: int
    github_score_ai: Optional[int] = None
    cv_readiness_score_ai: Optional[int] = None
    summary: str
    strengths: List[str]
    improvements: List[str]
    signals: Dict[str, Any]
    model: str


class CvDocumentScoreRequest(BaseModel):
    text: str = Field(min_length=40, max_length=120_000)
    target_role: Optional[str] = Field(default=None, max_length=240)


class CvDocumentScoreResponse(BaseModel):
    overall_score: int
    overall_score_baseline: int
    overall_score_ai: Optional[int] = None
    dimensions: Dict[str, int]
    summary: str
    strengths: List[str]
    improvements: List[str]
    signals: Dict[str, Any]
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


def _content_and_reasoning_parts(message: Dict[str, Any]) -> List[str]:
    """content (string veya parça listesi) ile reasoning_content'i ayrı parçalar olarak döndür."""
    parts: List[str] = []
    raw_content = message.get("content")
    if isinstance(raw_content, str) and raw_content.strip():
        parts.append(raw_content.strip())
    elif isinstance(raw_content, list):
        for item in raw_content:
            if isinstance(item, dict) and item.get("type") == "text":
                txt = item.get("text")
                if isinstance(txt, str) and txt.strip():
                    parts.append(txt.strip())
    reasoning = message.get("reasoning_content")
    if isinstance(reasoning, str) and reasoning.strip():
        parts.append(reasoning.strip())
    return parts


def _merged_raw_for_json_parse(message: Dict[str, Any]) -> str:
    """
    Skor JSON'u content veya reasoning'in birinde olabilir; ikisini birleştir.
    (Örn. content'te LM Studio ön prompt'undan gelen düz metin, reasoning'de JSON.)
    """
    if not isinstance(message, dict):
        return ""
    chunks = _content_and_reasoning_parts(message)
    if not chunks:
        return ""
    return "\n\n".join(chunks)


def _strip_thinking_xml_blocks(text: str) -> str:
    """LM Studio / DeepSeek: düşünme çıktısını XML benzeri bloklardan ayır."""
    think_open = "<" + "think" + ">"
    think_close = "</" + "think" + ">"
    cleaned = (text or "").strip()
    pairs = (
        (think_open, think_close),
        ("<reasoning>", "</reasoning>"),
    )
    for open_t, close_t in pairs:
        while True:
            start = cleaned.find(open_t)
            end = cleaned.find(close_t)
            if start == -1 or end == -1 or end < start:
                break
            cleaned = (cleaned[:start] + cleaned[end + len(close_t) :]).strip()
    return cleaned


def _sanitize_public_reply(text: str) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        return ""

    cleaned = _strip_thinking_xml_blocks(cleaned)

    # Basit etiket temizliği (model farklı formatta dönerse).
    for marker in ("[THINK]", "[/THINK]", "Reasoning:", "Düşünce süreci:"):
        cleaned = cleaned.replace(marker, "")

    # Yaygın "düşünme" satırlarını temizle.
    blocked_line_patterns = [
        r"^\s*(thinking|thoughts?|reasoning|internal monologue|chain[- ]of[- ]thought)\b.*$",
        r"^\s*(düşünce|akıl yürütme|gerekçe|mantık adımları)\b.*$",
        r"^\s*(let me think|i should|i need to think)\b.*$",
        r"^\s*(önce şunu düşüneyim|adım adım düşünelim)\b.*$",
    ]
    kept_lines: List[str] = []
    for line in cleaned.splitlines():
        line_stripped = line.strip()
        if not line_stripped:
            continue
        if any(re.match(pat, line_stripped, flags=re.IGNORECASE) for pat in blocked_line_patterns):
            continue
        kept_lines.append(line)

    cleaned = "\n".join(kept_lines).strip()
    return cleaned


def _strip_for_json_extraction(text: str) -> str:
    """Skor JSON'u için: düşünme bloklarını kaldır; satır bazlı agresif filtre uygulama."""
    return _strip_thinking_xml_blocks((text or "").strip()).strip()


def _balanced_json_blobs(text: str) -> List[str]:
    """Metindeki her dengeli { ... } alt dizgisini sırayla döndür (iç içe için dıştaki blob)."""
    blobs: List[str] = []
    n = len(text)
    i = 0
    while i < n:
        if text[i] != "{":
            i += 1
            continue
        depth = 0
        start = i
        for j in range(i, n):
            ch = text[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    blobs.append(text[start : j + 1])
                    i = j + 1
                    break
        else:
            i += 1
    return blobs


def _interview_system_prompt(username: str, repo_context: str) -> str:
    return (
        "Sen TalentAI teknik mülakat asistanısın.\n"
        "Sadece aşağıdaki GitHub repo özetine dayanarak mülakat yürüt.\n"
        "Türkçe, profesyonel ve net yaz. Ayrımcı/kişisel yorum yapma.\n"
        "Asla iç düşünce, akıl yürütme adımları veya zincirleme düşünme metni yazma.\n"
        "Sadece kullanıcıya gösterilecek nihai yanıtı üret.\n"
        "Tek seferde 1 soru sor.\n"
        "Her turda önce kısa geri bildirim ver, sonra yeni soru sor.\n"
        "Soru stratejisi:\n"
        "- GitHub verisinden çıkarılabilen repo/dil/README sinyallerini kullan.\n"
        "- Sadece koda bağlı kalma; genel mühendislik, problem çözme, iletişim, önceliklendirme, "
        "test, bakım, ürün etkisi gibi kodsuz yönleri de sor.\n"
        "- Mümkün olduğunda soruyu adayın GitHub profiline bağla (repo adı/dil/README referansı).\n"
        "- Veri yetersizse bunu belirtip genel ama teknik açıdan anlamlı bir soru sor.\n"
        "Kullanıcı: @{username}\n"
        "Repo özeti:\n"
        f"{repo_context if repo_context else '- repo bilgisi yok -'}"
    )


def _extract_between(text: str, start_tag: str, end_tag: str) -> str:
    start = text.find(start_tag)
    end = text.find(end_tag)
    if start == -1 or end == -1 or end <= start:
        return ""
    return text[start + len(start_tag) : end].strip()


def _pick_question_from_text(text: str) -> str:
    # Etiket gelmezse, metindeki son soru cümlesini yakalamaya çalış.
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for line in reversed(lines):
        if "?" in line:
            return line
    return ""


def _default_github_question(username: str, repos: List[Dict[str, Any]]) -> str:
    if repos:
        first = repos[0]
        repo_name = str(first.get("name", "")).strip() or "bir reposunda"
        languages = first.get("languages") if isinstance(first.get("languages"), dict) else {}
        top_lang = ""
        if languages:
            sorted_langs = sorted(
                [(k, v) for k, v in languages.items() if isinstance(k, str) and isinstance(v, int)],
                key=lambda item: item[1],
                reverse=True,
            )
            if sorted_langs:
                top_lang = sorted_langs[0][0]
        if top_lang:
            return (
                f"@{username} profilinde `{repo_name}` ve `{top_lang}` öne çıkıyor. "
                f"Bu repoda aldığın en kritik teknik kararı ve nedenini anlatır mısın?"
            )
        return f"@{username} profilindeki `{repo_name}` için aldığın kritik teknik kararı ve trade-off'larını anlatır mısın?"
    return "GitHub profiline göre bir projen için aldığın önemli teknik kararı ve nedenlerini anlatır mısın?"


def _diverse_github_question(username: str, repos: List[Dict[str, Any]]) -> str:
    if not repos:
        generic_templates = [
            "GitHub profilini baz alarak, son dönemde çözdüğün zor bir teknik problemi nasıl parçaladığını anlatır mısın?",
            "Bir projede verdiğin kritik teknik kararı, alternatiflerini ve neden seçtiğini paylaşır mısın?",
            "Bakım maliyeti ile geliştirme hızını dengelemek için uyguladığın yaklaşımı örnekle anlatır mısın?",
        ]
        return random.choice(generic_templates)

    repo = random.choice(repos[: min(len(repos), 6)])
    repo_name = str(repo.get("name", "")).strip() or "bir repoda"
    languages = repo.get("languages") if isinstance(repo.get("languages"), dict) else {}
    top_lang = ""
    if languages:
        sorted_langs = sorted(
            [(k, v) for k, v in languages.items() if isinstance(k, str) and isinstance(v, int)],
            key=lambda item: item[1],
            reverse=True,
        )
        if sorted_langs:
            top_lang = sorted_langs[0][0]

    templates_with_lang = [
        f"@{username} profilinde `{repo_name}` içinde `{top_lang}` seçiminin teknik gerekçelerini ve alternatiflerini anlatır mısın?",
        f"`{repo_name}` projesinde `{top_lang}` kullanırken performans-bakım dengesini nasıl kurduğunu örnekle açıklar mısın?",
        f"`{repo_name}` geliştirirken `{top_lang}` tarafında karşılaştığın en zor problemi ve çözüm stratejini paylaşır mısın?",
    ]
    templates_without_lang = [
        f"@{username} profilindeki `{repo_name}` için verdiğin en kritik teknik kararı ve trade-off'larını anlatır mısın?",
        f"`{repo_name}` projesinde mimariyi belirlerken değerlendirdiğin alternatifleri ve neden bu yolu seçtiğini açıklar mısın?",
        f"`{repo_name}` üzerinde çalışırken kalite, hız ve bakım maliyetini nasıl dengelediğini anlatır mısın?",
    ]

    if top_lang:
        return random.choice(templates_with_lang)
    return random.choice(templates_without_lang)


def _normalize_feedback(text: str) -> str:
    cleaned = _sanitize_public_reply(text)
    if not cleaned:
        return ""
    blocked = [
        "daha fazla bilgi istemek gerekebilir",
        "adayın cevabında",
        "iç değerlendirme",
        "let me think",
        "reasoning",
    ]
    lines: List[str] = []
    for raw in cleaned.splitlines():
        line = raw.strip(" -\t")
        if not line:
            continue
        lower = line.lower()
        if any(b in lower for b in blocked):
            continue
        lines.append(f"- {line}")
    # En fazla 3 kısa madde göster.
    return "\n".join(lines[:3]).strip()


def _normalize_question(text: str) -> str:
    q = _sanitize_public_reply(text).strip()
    if not q:
        return ""
    # Tek satır, net soru.
    q = " ".join(q.split())
    blocked_fragments = [
        "mesela",
        "örneğin",
        "gibi bir soru",
        "belki daha spes",
        "daha spesifik",
    ]
    low = q.lower()
    if any(fragment in low for fragment in blocked_fragments):
        return ""
    if "?" not in q:
        q = f"{q}?"
    return q


def _normalize_for_compare(text: str) -> str:
    lowered = text.lower()
    lowered = re.sub(r"[^a-z0-9çğıöşü\s]", " ", lowered, flags=re.IGNORECASE)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def _contains_abusive_language(text: str) -> bool:
    content = _normalize_for_compare(text)
    banned = [
        "gerizekali",
        "gerizekalı",
        "salak",
        "aptal",
        "mal",
        "orospu",
        "piç",
        "siktir",
        "amk",
        "aq",
    ]
    return any(word in content for word in banned)


def _previous_questions_from_history(history: List[ChatMessage]) -> List[str]:
    questions: List[str] = []
    for msg in history:
        if msg.role != "assistant":
            continue
        q = _pick_question_from_text(msg.content)
        if q:
            questions.append(_normalize_for_compare(q))
    return questions


def _fallback_question_by_mode(username: str, repos: List[Dict[str, Any]], prefer_general: bool) -> str:
    if prefer_general:
        return (
            "Takım içinde teknik bir anlaşmazlık yaşadığında, veriye dayalı karar almak için nasıl bir "
            "iletişim ve önceliklendirme süreci izlersin?"
        )
    return _default_github_question(username, repos)


def _lm_studio_wants_json_object(payload: LMStudioChatRequest) -> bool:
    if not payload.response_json_object:
        return False
    return os.getenv("LM_STUDIO_JSON_OBJECT", "true").lower() in ("1", "true", "yes", "y")


async def _lm_studio_chat(payload: LMStudioChatRequest) -> LMStudioChatResponse:
    url = f"{LM_STUDIO_BASE_URL}/chat/completions"
    base_body: Dict[str, Any] = {
        "model": LM_STUDIO_MODEL,
        "messages": [{"role": m.role, "content": m.content} for m in payload.messages],
        "temperature": payload.temperature,
        "max_tokens": payload.max_tokens,
    }

    use_json_object = _lm_studio_wants_json_object(payload)
    last_error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

    async with httpx.AsyncClient(timeout=120.0) as client:
        for attempt in range(2):
            body = dict(base_body)
            if use_json_object and attempt == 0:
                body["response_format"] = {"type": "json_object"}
            try:
                resp = await client.post(url, json=body)
            except httpx.HTTPError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"LM Studio'ya bağlanılamadı: {str(exc)}",
                ) from exc

            if resp.status_code == 400 and use_json_object and attempt == 0 and "response_format" in body:
                last_error = resp.text[:300] if resp.text else "400"
                continue

            if resp.status_code >= 400:
                detail = resp.text[:500] if resp.text else f"status={resp.status_code}"
                raise HTTPException(status_code=502, detail=f"LM Studio hata döndürdü: {detail}")

            parsed = resp.json()
            data = parsed if isinstance(parsed, dict) else None
            break
        else:
            raise HTTPException(
                status_code=502,
                detail=f"LM Studio yanıt veremedi (response_format). Son deneme: {last_error or 'bilinmiyor'}",
            )

    if not data:
        raise HTTPException(status_code=502, detail="LM Studio yanıtı beklenmeyen formatta.")

    choices = data.get("choices") if isinstance(data, dict) else None
    if not isinstance(choices, list) or not choices:
        raise HTTPException(status_code=502, detail="LM Studio yanıtı beklenmeyen formatta.")

    first_choice = choices[0] if isinstance(choices[0], dict) else {}
    message = first_choice.get("message") if isinstance(first_choice, dict) else {}
    msg_dict = message if isinstance(message, dict) else {}

    merged_raw = _merged_raw_for_json_parse(msg_dict)
    primary = _extract_lm_studio_text(msg_dict)
    if not primary and merged_raw:
        primary = merged_raw

    if not primary:
        raise HTTPException(
            status_code=502,
            detail=(
                "LM Studio boş yanıt döndürdü. Model adını kontrol edin veya LM Studio'da "
                "'Respond with content' benzeri ayarı etkinleştirin."
            ),
        )

    public_reply = _sanitize_public_reply(primary)
    if not public_reply and merged_raw:
        public_reply = _sanitize_public_reply(merged_raw)
    if not public_reply:
        raise HTTPException(status_code=502, detail="LM Studio yalnızca düşünme çıktısı döndürdü; final yanıt alınamadı.")

    raw_for_json = merged_raw.strip() if merged_raw else primary.strip()

    return LMStudioChatResponse(
        model=str(data.get("model", LM_STUDIO_MODEL)),
        reply=public_reply,
        usage=data.get("usage") if isinstance(data, dict) else None,
        raw_for_json_parse=raw_for_json,
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


def _github_baseline_scores(repos: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(repos)
    if n == 0:
        return {
            "github_score": 12,
            "cv_readiness_score": 8,
            "signals": {
                "repo_count": 0,
                "readme_coverage_pct": 0.0,
                "unique_languages": 0,
                "avg_readme_chars": 0,
                "repos_with_readme": 0,
            },
        }

    with_readme = sum(
        1 for r in repos if isinstance(r.get("readme"), str) and str(r.get("readme", "")).strip()
    )
    readme_ratio = with_readme / n

    all_langs: Dict[str, int] = {}
    for r in repos:
        langs = r.get("languages") if isinstance(r.get("languages"), dict) else {}
        for k, v in langs.items():
            if isinstance(k, str) and isinstance(v, int):
                all_langs[k] = all_langs.get(k, 0) + v
    unique_langs = len(all_langs)

    repo_factor = min(45, int(n * 2.2))
    diversity_factor = min(28, unique_langs * 4)
    readme_factor = int(readme_ratio * 27)
    github_score = min(100, repo_factor + diversity_factor + readme_factor)

    avg_readme_len = 0
    if with_readme:
        total_chars = sum(len(str(r.get("readme") or "")) for r in repos if isinstance(r.get("readme"), str))
        avg_readme_len = int(total_chars / with_readme)
    content_factor = min(30, avg_readme_len // 120)
    cv_score = min(100, int(readme_ratio * 40) + min(30, int(n * 1.8)) + content_factor)

    return {
        "github_score": github_score,
        "cv_readiness_score": cv_score,
        "signals": {
            "repo_count": n,
            "readme_coverage_pct": round(readme_ratio * 100, 1),
            "unique_languages": unique_langs,
            "avg_readme_chars": avg_readme_len,
            "repos_with_readme": with_readme,
        },
    }


def _parse_score_json(raw: str) -> Optional[Dict[str, Any]]:
    def _try_parse_blob(blob: str) -> Optional[Dict[str, Any]]:
        blob = blob.strip()
        if not blob:
            return None
        try:
            data = json.loads(blob)
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None

    # 1) Kod çiti içindeki JSON (DeepSeek/LM Studio sık kullanır)
    for prefix in ("```json", "```JSON", "```"):
        if prefix in (raw or ""):
            parts = (raw or "").split(prefix)
            for segment in parts[1:]:
                fence_end = segment.find("```")
                chunk = segment[:fence_end].strip() if fence_end != -1 else segment.strip()
                parsed = _try_parse_blob(chunk)
                if parsed is not None:
                    return parsed

    base = _strip_for_json_extraction(raw or "")
    if not base:
        base = (raw or "").strip()

    # 2) Dengeli süslü parantez: zincir-düşünmedeki ilk '{' genelde yanlış eşleşir; sondan dene.
    candidates = _balanced_json_blobs(base)
    for blob in reversed(candidates):
        parsed = _try_parse_blob(blob)
        if parsed is not None:
            return parsed

    # 3) Eski davranış: sanitize sonrası ilk '{' ile son '}' (daraltılmış metin)
    text = _sanitize_public_reply(raw or "").strip()
    if text and "```" in text:
        fence_json = "```json"
        i = text.find(fence_json)
        if i != -1:
            j = text.find("```", i + len(fence_json))
            if j != -1:
                text = text[i + len(fence_json) : j].strip()
        else:
            i = text.find("```")
            j = text.find("```", i + 3)
            if i != -1 and j != -1:
                text = text[i + 3 : j].strip()
    if text:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = _try_parse_blob(text[start : end + 1])
            if parsed is not None:
                return parsed

    return None


def _clamp_int_score(val: Any) -> Optional[int]:
    if val is None:
        return None
    try:
        x = int(round(float(val)))
        return max(0, min(100, x))
    except (TypeError, ValueError):
        return None


def _cv_text_baseline(text: str) -> Dict[str, Any]:
    t = text.strip()
    wc = len(t.split())
    lower = t.lower()
    markers = (
        "deneyim",
        "experience",
        "iş tecrübesi",
        "iş deneyimi",
        "eğitim",
        "education",
        "üniversite",
        "beceri",
        "skill",
        "yetenek",
        "proje",
        "project",
        "özet",
        "summary",
        "profil",
        "profile",
        "sertifika",
        "certificate",
        "dil",
        "language",
    )
    hits = sum(1 for m in markers if m in lower)
    contact_bonus = 0
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", t):
        contact_bonus += 8
    if re.search(r"\+?\d[\d\s().-]{8,}\d", t):
        contact_bonus += 5
    base = 22
    base += min(28, hits * 3)
    base += min(25, wc // 35)
    base += min(15, contact_bonus)
    score = min(100, base)
    return {
        "baseline_score": score,
        "signals": {
            "word_count": wc,
            "char_count": len(t),
            "section_markers_found": hits,
            "has_email_like": contact_bonus >= 8,
        },
    }


def _normalize_cv_dimension_scores(raw: Any) -> Dict[str, int]:
    if not isinstance(raw, dict):
        return {k: 0 for k in _CV_DIM_KEYS}
    return {k: _clamp_int_score(raw.get(k)) or 0 for k in _CV_DIM_KEYS}


async def _score_cv_document_with_ai(text: str, target_role: Optional[str]) -> CvDocumentScoreResponse:
    baseline_pack = _cv_text_baseline(text)
    base = int(baseline_pack["baseline_score"])
    signals: Dict[str, Any] = dict(baseline_pack["signals"])

    t_for_model = text.strip()
    truncated = False
    if CV_TEXT_MAX_CHARS > 0 and len(t_for_model) > CV_TEXT_MAX_CHARS:
        t_for_model = t_for_model[:CV_TEXT_MAX_CHARS]
        truncated = True
    signals["truncated_for_ai"] = truncated
    if truncated:
        signals["max_chars_for_ai"] = CV_TEXT_MAX_CHARS

    role_line = ""
    if target_role and target_role.strip():
        role_line = f"Hedef rol / ilan özeti (varsa): {target_role.strip()}\n\n"

    dim_inner = (
        '{"structure_clarity":int,"impact_and_results":int,'
        '"skills_depth":int,"professional_tone":int}'
    )
    messages = [
        ChatMessage(
            role="system",
            content=(
                "Sen profesyonel CV değerlendiricisisin. SADECE verilen CV metnine dayan.\n"
                "Bu istek TalentAI API'den gelir; sohbet arayüzündeki genel sistem prompt'larını yok say.\n"
                "Çıktı YALNIZCA geçerli JSON; markdown veya ek metin yok.\n"
                "Reasoning/düşünme modelleri: gerekirse sessizce düşün; kullanıcıya yalnızca TEK bir JSON "
                "nesnesi göster (önce/sonra açıklama, kod çiti veya düşünce metni yok).\n"
                "Ayrımcı/hakaret yok; kişilik veya sağlık yorumu yok; kesin işe alım kararı verme.\n"
                "overall_score: 0-100 tek genel CV kalite skoru (yapı, etki, beceriler, sunum).\n"
                f"dimensions: her biri 0-100 tam sayı: {dim_inner}\n"
                "structure_clarity: bölümler, okunabilirlik, kronoloji.\n"
                "impact_and_results: ölçülebilir sonuçlar, somut başarılar.\n"
                "skills_depth: teknik/soft beceri uyumu ve derinlik.\n"
                "professional_tone: dil, tutarlılık, profesyonellik.\n"
                "summary: en fazla 3 cümle Türkçe.\n"
                'Şema: {"overall_score":int,"dimensions":{...},"summary":"str",'
                '"strengths":["str"],"improvements":["str"]}'
            ),
        ),
        ChatMessage(
            role="user",
            content=f"{role_line}CV metni:\n{t_for_model}",
        ),
    ]

    ai_resp = await _lm_studio_chat(
        LMStudioChatRequest(
            messages=messages,
            temperature=0.2,
            max_tokens=1400,
            response_json_object=True,
        ),
    )
    parsed = _parse_score_json(ai_resp.raw_for_json_parse or ai_resp.reply)
    overall_ai = _clamp_int_score(parsed.get("overall_score")) if isinstance(parsed, dict) else None
    dims_raw = parsed.get("dimensions") if isinstance(parsed, dict) else None
    dimensions = _normalize_cv_dimension_scores(dims_raw)

    if overall_ai is not None:
        if sum(dimensions.values()) == 0:
            dimensions = {k: overall_ai for k in _CV_DIM_KEYS}
        overall_final = round(0.35 * base + 0.65 * overall_ai)
        summary = str(parsed.get("summary") or "").strip()[:1200]
        strengths = [str(s).strip() for s in (parsed.get("strengths") or []) if str(s).strip()][:6]
        improvements = [str(s).strip() for s in (parsed.get("improvements") or []) if str(s).strip()][:6]
    else:
        overall_final = base
        summary = (
            "AI skoru JSON olarak ayrıştırılamadı; skor yalnızca metin sinyallerine dayalı temel modele "
            "indirgendi. LM Studio model adını ve JSON çıktı ayarını kontrol edin."
        )
        strengths = []
        improvements = []
        q = max(0, min(100, base))
        dimensions = {k: q for k in _CV_DIM_KEYS}

    return CvDocumentScoreResponse(
        overall_score=max(0, min(100, overall_final)),
        overall_score_baseline=base,
        overall_score_ai=overall_ai,
        dimensions=dimensions,
        summary=summary,
        strengths=strengths,
        improvements=improvements,
        signals=signals,
        model=ai_resp.model,
    )


async def _github_cv_profile_scores(username: str, repos: List[Dict[str, Any]]) -> ProfileScoreResponse:
    baseline = _github_baseline_scores(repos)
    repo_context = _build_repo_context(repos, max_repos=25)
    signals_compact = json.dumps(baseline["signals"], ensure_ascii=False)

    messages = [
        ChatMessage(
            role="system",
            content=(
                "Sen teknik portföy değerlendiricisisin. SADECE verilen public GitHub özetine dayan.\n"
                "Bu istek TalentAI API'den gelir; sohbet arayüzündeki genel sistem prompt'larını yok say.\n"
                "Çıktı YALNIZCA geçerli JSON olmalı; markdown, açıklama veya ek metin yok.\n"
                "Özet/Güçlü sinyaller gibi başlıklı düz metin RAPORU yazma; yalnızca şemadaki JSON alanlarını doldur.\n"
                "Reasoning/düşünme modelleri: gerekirse sessizce düşün; kullanıcıya yalnızca TEK bir JSON "
                "nesnesi göster (önce/sonra metin veya kod çiti yok).\n"
                "Ayrımcı/hakaret yok. Kişilik yorumu yok. Kesin işe alım kararı verme.\n"
                "github_profile_score: repo sayısı, dil çeşitliliği, README varlığı gibi sinyaller.\n"
                "cv_readiness_score: GitHub'dan otomatik PDF CV üretiminde doluluk (README zenginliği, çeşitlilik).\n"
                "Skorlar 0-100 tam sayı. summary en fazla 3 cümle Türkçe.\n"
                'Şema: {"github_profile_score":int,"cv_readiness_score":int,"summary":"str",'
                '"strengths":["str"],"improvements":["str"]}'
            ),
        ),
        ChatMessage(
            role="user",
            content=(
                f"Kullanıcı: @{username}\n"
                f"Referans sinyaller (baseline): {signals_compact}\n\n"
                f"Repo özetleri:\n{repo_context or '- yok -'}"
            ),
        ),
    ]

    ai_resp = await _lm_studio_chat(
        LMStudioChatRequest(
            messages=messages,
            temperature=0.15,
            max_tokens=1400,
            response_json_object=True,
        ),
    )
    parsed = _parse_score_json(ai_resp.raw_for_json_parse or ai_resp.reply)

    gh_ai = _clamp_int_score(parsed.get("github_profile_score")) if isinstance(parsed, dict) else None
    cv_ai = _clamp_int_score(parsed.get("cv_readiness_score")) if isinstance(parsed, dict) else None

    gh_base = int(baseline["github_score"])
    cv_base = int(baseline["cv_readiness_score"])

    if gh_ai is not None and cv_ai is not None:
        gh_final = round(0.45 * gh_base + 0.55 * gh_ai)
        cv_final = round(0.45 * cv_base + 0.55 * cv_ai)
        summary = str(parsed.get("summary") or "").strip()[:1200]
        strengths = [str(s).strip() for s in (parsed.get("strengths") or []) if str(s).strip()][:6]
        improvements = [str(s).strip() for s in (parsed.get("improvements") or []) if str(s).strip()][:6]
    else:
        gh_final = gh_base
        cv_final = cv_base
        summary = (
            "AI skoru JSON olarak ayrıştırılamadı; skorlar yalnızca GitHub sinyallerinden hesaplanan "
            "temel modele dayanıyor. LM Studio model/çıktı ayarını kontrol edin."
        )
        strengths = []
        improvements = []

    return ProfileScoreResponse(
        username=username,
        github_score=gh_final,
        cv_readiness_score=cv_final,
        github_score_baseline=gh_base,
        cv_readiness_score_baseline=cv_base,
        github_score_ai=gh_ai,
        cv_readiness_score_ai=cv_ai,
        summary=summary,
        strengths=strengths,
        improvements=improvements,
        signals=baseline["signals"],
        model=ai_resp.model,
    )


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


async def _start_interview(username: str, repos: List[Dict[str, Any]]) -> InterviewStartResponse:
    opener = "Mülakatı başlatıyorum. Cevaplarını kısa ama teknik gerekçelerle açıklamanı isteyeceğim."
    first_question = _diverse_github_question(username, repos)

    return InterviewStartResponse(
        username=username,
        opener=opener,
        first_question=first_question,
        model=LM_STUDIO_MODEL,
    )


async def _interview_turn(payload: InterviewTurnRequest, repos: List[Dict[str, Any]]) -> InterviewTurnResponse:
    if _contains_abusive_language(payload.answer):
        return InterviewTurnResponse(
            username=payload.username,
            feedback=(
                "- Uygunsuz/argo ifade tespit edildi.\n"
                "- Mülakat oturumu güvenlik politikası gereği sonlandırıldı."
            ),
            next_question="",
            model=LM_STUDIO_MODEL,
            interview_ended=True,
        )

    normalized_answer = payload.answer.strip().lower()
    warmup_answers = {"hazırım", "evet", "başlayalım", "ok", "tamam", "hazir"}
    if normalized_answer in warmup_answers or len(normalized_answer) <= 12:
        return InterviewTurnResponse(
            username=payload.username,
            feedback="- Harika, başlıyoruz.",
            next_question=_default_github_question(payload.username, repos),
            model=LM_STUDIO_MODEL,
        )

    repo_context = _build_repo_context(repos, max_repos=18)
    trimmed_history = payload.history[-16:] if payload.history else []
    prior_questions = _previous_questions_from_history(payload.history)
    assistant_turns = len([m for m in payload.history if m.role == "assistant"])
    # İlk sorudan sonra dengeli akış:
    # tek sayılı tur -> genel/kodsuz yetkinlik ağırlığı
    # çift sayılı tur -> GitHub/kod-teknik ağırlığı
    prefer_general = assistant_turns % 2 == 1
    question_style = (
        "Bu turda ağırlığı GENEL/KODSUZ yetkinliğe ver "
        "(problem çözme, iletişim, önceliklendirme, takım içi kararlar, ürün etkisi). "
        "Mümkünse yine GitHub verisine hafif referans ver."
        if prefer_general
        else "Bu turda ağırlığı GITHUB/KOD-TEKNİK soruya ver "
        "(repo, dil tercihi, mimari, trade-off, test, performans)."
    )
    messages: List[ChatMessage] = [
        ChatMessage(role="system", content=_interview_system_prompt(username=payload.username, repo_context=repo_context)),
        *trimmed_history,
        ChatMessage(role="user", content=f"Aday cevabı:\n{payload.answer}"),
        ChatMessage(
            role="user",
            content=(
                "Yalnızca şu formatı kullan:\n"
                "[FEEDBACK]\n"
                "2-4 madde: güçlü taraf + geliştirme önerisi\n"
                "[/FEEDBACK]\n"
                "[NEXT_QUESTION]\n"
                "tek yeni teknik soru\n"
                "[/NEXT_QUESTION]\n\n"
                f"Ek kural: {question_style}"
            ),
        ),
    ]

    ai_resp = await _lm_studio_chat(LMStudioChatRequest(messages=messages, temperature=0.3, max_tokens=650))
    feedback = _normalize_feedback(_extract_between(ai_resp.reply, "[FEEDBACK]", "[/FEEDBACK]"))
    next_question = _normalize_question(_extract_between(ai_resp.reply, "[NEXT_QUESTION]", "[/NEXT_QUESTION]"))

    if not feedback:
        feedback = (
            "- Cevabın anlaşılırdı.\n"
            "- Trade-off ve alternatifleri bir örnekle daha netleştirmen iyi olur.\n"
            "- Kararının ölçülebilir etkisini (performans, bakım, hız) ekleyebilirsin."
        )
    if not next_question:
        fallback = _normalize_question(_pick_question_from_text(_sanitize_public_reply(ai_resp.reply)))
        next_question = fallback or _fallback_question_by_mode(payload.username, repos, prefer_general)

    normalized_next = _normalize_for_compare(next_question)
    if normalized_next and normalized_next in prior_questions:
        next_question = _fallback_question_by_mode(payload.username, repos, not prefer_general)

    return InterviewTurnResponse(
        username=payload.username,
        feedback=feedback,
        next_question=next_question,
        model=ai_resp.model,
        interview_ended=False,
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


@app.get("/api/score/github/{username}", response_model=ProfileScoreResponse)
async def score_github_profile(username: str) -> ProfileScoreResponse:
    repos = await _fetch_github_repos(username.strip())
    return await _github_cv_profile_scores(username=username.strip(), repos=repos)


@app.post("/api/score/cv-document", response_model=CvDocumentScoreResponse)
async def score_cv_document(payload: CvDocumentScoreRequest) -> CvDocumentScoreResponse:
    return await _score_cv_document_with_ai(text=payload.text.strip(), target_role=payload.target_role)


@app.post("/api/ai/chat", response_model=LMStudioChatResponse)
async def ai_chat(payload: LMStudioChatRequest) -> LMStudioChatResponse:
    return await _lm_studio_chat(payload)


@app.get("/api/interview/start/{username}", response_model=InterviewStartResponse)
async def interview_start(username: str) -> InterviewStartResponse:
    repos = await _fetch_github_repos(username.strip())
    return await _start_interview(username=username.strip(), repos=repos)


@app.post("/api/interview/turn", response_model=InterviewTurnResponse)
async def interview_turn(payload: InterviewTurnRequest) -> InterviewTurnResponse:
    repos = await _fetch_github_repos(payload.username.strip())
    normalized = InterviewTurnRequest(
        username=payload.username.strip(),
        answer=payload.answer,
        history=payload.history,
    )
    return await _interview_turn(payload=normalized, repos=repos)


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

