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
`GET /api/github/analyze/{username}` (GitHub verisinden AI analiz metni üretir)

`POST /api/ai/chat` (LM Studio - OpenAI uyumlu)

LM Studio varsayılan adres:
- `LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1`
- `LM_STUDIO_MODEL=local-model`

Örnek body:
```json
{
  "messages": [
    { "role": "system", "content": "Kısa cevap ver." },
    { "role": "user", "content": "Merhaba" }
  ],
  "temperature": 0.4,
  "max_tokens": 256
}
```

Örnek:
- `http://localhost:8000/api/github/octocat`

