# TalentAI Backend (MVP - Step 1)

## Çalıştırma

1. Sanal ortam oluştur:
   - `python -m venv .venv`
   - `.\.venv\Scripts\Activate.ps1` (PowerShell)
2. Bağımlılıkları kur:
   - `pip install -r requirements.txt`
3. (Opsiyonel) GitHub rate limit için token:
   - `setx GITHUB_TOKEN "..."` veya env’e ekle
4. Sunucuyu başlat:
   - `uvicorn app.main:app --reload --port 8000`

## Endpoint

`GET /api/github/{username}`

Örnek:
- `http://localhost:8000/api/github/octocat`

