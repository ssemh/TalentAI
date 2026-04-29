# YGA Backend — API Endpoint Dokümantasyonu

> **Base URL:** `http://localhost:5105`  
> **Swagger UI:** `http://localhost:5105/swagger`  
> **CORS İzinli Portlar:** `3000`, `5173`, `3001`

---

## 🔑 Kimlik Doğrulama (Auth)

Korumalı endpoint'lere istek atabilmek için önce **register** olup **login** yaparak token almanız gerekir.  
Token'ı her korumalı isteğin header'ına ekleyin:

```
Authorization: Bearer <token>
```

---

### 1) Kayıt Ol

```
POST /api/v1/auth/register
```

**Auth Gerekli:** Hayır

**Request Body:**
```json
{
  "email": "furkan@test.dev",
  "password": "StrongPass123!"
}
```

| Alan | Tip | Zorunlu | Kural |
|------|-----|---------|-------|
| `email` | string | ✅ | Geçerli email formatı |
| `password` | string | ✅ | En az 8 karakter |

**Başarılı Yanıt (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-04-29T19:00:00Z",
  "userId": "a3b2c1d4-5678-9012-3456-abcdef123456",
  "email": "furkan@test.dev"
}
```

**Hata Yanıtları:**
- `400` — Email zaten kayıtlı / Validasyon hatası

---

### 2) Giriş Yap

```
POST /api/v1/auth/login
```

**Auth Gerekli:** Hayır

**Request Body:**
```json
{
  "email": "furkan@test.dev",
  "password": "StrongPass123!"
}
```

**Başarılı Yanıt (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-04-29T19:00:00Z",
  "userId": "a3b2c1d4-5678-9012-3456-abcdef123456",
  "email": "furkan@test.dev"
}
```

**Hata Yanıtları:**
- `401` — Email veya şifre hatalı

---

## 📊 GitHub Analiz

### 3) GitHub Profili Analiz Et

```
POST /api/v1/analyze/github
```

**Auth Gerekli:** ✅ Bearer Token

**Request Body:**
```json
{
  "username": "torvalds"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `username` | string | ✅ | GitHub kullanıcı adı |

**Başarılı Yanıt (200):**
```json
{
  "reportId": "b5e7f123-4567-8901-abcd-ef1234567890",
  "githubUsername": "torvalds",
  "createdAt": "2026-04-29T17:00:00Z",
  "scores": [
    { "name": "ProfileCompleteness", "value": 100 },
    { "name": "RepositoryActivity", "value": 95 },
    { "name": "CodeQuality", "value": 78 },
    { "name": "LanguageDiversity", "value": 100 },
    { "name": "CommunityEngagement", "value": 100 }
  ],
  "message": "GitHub profili başarıyla analiz edildi."
}
```

**Skor Açıklamaları (v2 — Repo-Level Metrikler):**

| Skor | Aralık | Veri Kaynağı | Ne Ölçüyor? |
|------|--------|-------------|-------------|
| `ProfileCompleteness` | 0-100 | Profil | name, bio, blog, location, company alanlarının doluluğu |
| `RepositoryActivity` | 0-100 | Profil + Repo | Son 6 ayda aktif repo oranı + toplam repo/follower sayısı |
| `CodeQuality` | 0-100 | Repo | Repo'larda açıklama, lisans, orijinallik (fork olmama) oranı |
| `LanguageDiversity` | 0-100 | Repo | Kaç farklı programlama dili kullanılmış (8+ dil = 100) |
| `CommunityEngagement` | 0-100 | Repo | Toplam star + fork sayıları (topluluk etkileşimi) |

**Hata Yanıtları:**
- `400` — Username boş
- `401` — Token yok/geçersiz
- `502` — GitHub API'ye ulaşılamadı

---

### 4) Rapor Detayı Getir

```
GET /api/v1/reports/{reportId}
```

**Auth Gerekli:** ✅ Bearer Token

**Path Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `reportId` | GUID | Raporun benzersiz ID'si |

**Örnek:**
```
GET /api/v1/reports/b5e7f123-4567-8901-abcd-ef1234567890
```

**Başarılı Yanıt (200):**
```json
{
  "reportId": "b5e7f123-4567-8901-abcd-ef1234567890",
  "githubUsername": "torvalds",
  "createdAt": "2026-04-29T17:00:00Z",
  "scores": [
    { "name": "ProfileCompleteness", "value": 100 },
    { "name": "RepositoryActivity", "value": 95 },
    { "name": "CodeQuality", "value": 78 },
    { "name": "LanguageDiversity", "value": 100 },
    { "name": "CommunityEngagement", "value": 100 }
  ],
  "message": "Rapor başarıyla getirildi."
}
```

**Hata Yanıtları:**
- `401` — Token yok/geçersiz
- `403` — Rapor başka kullanıcıya ait
- `404` — Rapor bulunamadı

---

## 📄 CV Yükleme

### 5) CV Dosyası Yükle

```
POST /api/v1/upload-cv
```

**Auth Gerekli:** ✅ Bearer Token  
**Content-Type:** `multipart/form-data`

**Form Data:**

| Alan | Tip | Zorunlu | Kural |
|------|-----|---------|-------|
| `file` | File | ✅ | `.pdf`, `.docx`, `.doc` — Maks 10 MB |

**JavaScript Fetch Örneği:**
```javascript
const formData = new FormData();
formData.append('file', selectedFile);

const response = await fetch('http://localhost:5105/api/v1/upload-cv', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Content-Type header'ı EKLEMEYİN, FormData otomatik ayarlar
  },
  body: formData
});
```

**Axios Örneği:**
```javascript
const formData = new FormData();
formData.append('file', selectedFile);

const response = await axios.post('/api/v1/upload-cv', formData, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Başarılı Yanıt (200):**
```json
{
  "documentId": "c4d5e6f7-8901-2345-6789-abcdef012345",
  "fileName": "furkan_cv.pdf",
  "uploadedAt": "2026-04-29T17:05:00Z",
  "message": "CV başarıyla yüklendi."
}
```

**Hata Yanıtları:**
- `400` — Dosya seçilmedi / Geçersiz format / 10 MB aşıldı
- `401` — Token yok/geçersiz

---

### 6) Kullanıcının CV'lerini Listele

```
GET /api/v1/cvs/{userId}
```

**Auth Gerekli:** ✅ Bearer Token

**Path Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `userId` | GUID | Kullanıcının ID'si (login yanıtındaki `userId`) |

**Örnek:**
```
GET /api/v1/cvs/a3b2c1d4-5678-9012-3456-abcdef123456
```

**Başarılı Yanıt (200):**
```json
[
  {
    "documentId": "c4d5e6f7-8901-2345-6789-abcdef012345",
    "fileName": "furkan_cv.pdf",
    "uploadedAt": "2026-04-29T17:05:00Z",
    "message": "OK"
  },
  {
    "documentId": "d5e6f7a8-9012-3456-7890-bcdef0123456",
    "fileName": "furkan_cv_v2.docx",
    "uploadedAt": "2026-04-29T18:00:00Z",
    "message": "OK"
  }
]
```

**Hata Yanıtları:**
- `401` — Token yok/geçersiz
- `403` — Başka kullanıcının CV'lerine erişim denemesi

---

## 🏥 Sistem Sağlığı (Health)

Bu endpoint'ler **token gerektirmez**, monitoring amaçlıdır.

### 7) Genel Sistem Sağlığı

```
GET /api/v1/health
```

**Yanıt (200 veya 503):**
```json
{
  "status": "Healthy",
  "checks": {
    "database": "Healthy",
    "worker": "Healthy"
  },
  "worker": {
    "workerName": "YGA.Worker",
    "lastStatus": "Healthy",
    "lastSeenAtUtc": "2026-04-29T17:04:00Z"
  }
}
```

### 8) API Liveness

```
GET /api/v1/health/live
```

**Yanıt (200):**
```json
{
  "status": "Alive",
  "service": "YGA.API",
  "utc": "2026-04-29T17:04:00Z"
}
```

### 9) Worker Sağlığı

```
GET /api/v1/health/worker
```

**Yanıt (200 veya 503):**
```json
{
  "status": "Healthy",
  "worker": "YGA.Worker",
  "workerStatus": "Healthy",
  "lastSeenAtUtc": "2026-04-29T17:04:00Z",
  "ageSeconds": 45
}
```

---

## ⚡ Frontend Entegrasyon Özet Tablosu

| # | Metod | Endpoint | Auth | Content-Type | Not |
|---|-------|----------|------|--------------|-----|
| 1 | `POST` | `/api/v1/auth/register` | ❌ | `application/json` | |
| 2 | `POST` | `/api/v1/auth/login` | ❌ | `application/json` | |
| 3 | `POST` | `/api/v1/analyze/github` | ✅ | `application/json` | ⚠️ Rate limit: 5/dk |
| 4 | `GET` | `/api/v1/reports/{reportId}` | ✅ | — | |
| 5 | `GET` | `/api/v1/reports?page=1&pageSize=10` | ✅ | — | 📄 Sayfalı |
| 6 | `POST` | `/api/v1/upload-cv` | ✅ | `multipart/form-data` | |
| 7 | `GET` | `/api/v1/cvs/{userId}?page=1&pageSize=10` | ✅ | — | 📄 Sayfalı |
| 8 | `GET` | `/api/v1/health` | ❌ | — | |
| 9 | `GET` | `/api/v1/health/live` | ❌ | — | |
| 10 | `GET` | `/api/v1/health/worker` | ❌ | — | |

### Pagination (Sayfalama)

Sayfalı endpoint'ler `page` ve `pageSize` query parametreleri alır:
- `page`: Sayfa numarası (default: 1, minimum: 1)
- `pageSize`: Sayfa başına kayıt (default: 10, minimum: 1, maksimum: 50)

**Sayfalı yanıt formatı:**
```json
{
  "items": [ ... ],
  "page": 1,
  "pageSize": 10,
  "totalCount": 47,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

### Rate Limiting (İstek Sınırı)

| Politika | Limit | Uygulanan Endpoint |
|----------|-------|--------------------|
| `github` | Dakikada 5 istek | `POST /analyze/github` |
| `fixed` | Dakikada 30 istek | Diğer tüm endpoint'ler |

Limit aşıldığında `429 Too Many Requests` döner:
```json
{ "message": "Çok fazla istek gönderildi. Lütfen biraz bekleyin.", "statusCode": 429 }
```

---

## 🔧 Frontend İçin Hızlı Axios Setup Örneği

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5105/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Her istekte token'ı otomatik ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Kullanım örnekleri:
// await api.post('/auth/register', { email, password });
// await api.post('/auth/login', { email, password });
// await api.post('/analyze/github', { username: 'torvalds' });
// await api.get(`/reports/${reportId}`);
// await api.get(`/cvs/${userId}`);
```

---

## 📝 Önemli Notlar

1. **CORS:** Frontend `localhost:3000`, `localhost:5173` veya `localhost:3001` portlarında çalışmalı
2. **Token süresi:** Varsayılan 120 dakika (2 saat)
3. **Dosya yüklemede** `Content-Type` header'ını manuel set etmeyin, `FormData` otomatik ayarlar
4. **Tüm hatalar** standart JSON formatında döner: `{ "message": "...", "statusCode": 400 }`
5. **Swagger UI:** Backend çalışıyorken `http://localhost:5105/swagger` adresinden tüm endpoint'leri interaktif test edebilirsiniz
