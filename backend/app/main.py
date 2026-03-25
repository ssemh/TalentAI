import asyncio
import base64
import io
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

GITHUB_API_URL = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
MAX_README_CHARS = int(os.getenv("MAX_README_CHARS", "20000"))


def _github_headers() -> Dict[str, str]:
    headers: Dict[str, str] = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
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

        repos_resp.raise_for_status()
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

