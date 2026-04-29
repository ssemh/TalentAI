# Backend CV - Engineering Playbook

> Bu repo bir "CV + GitHub profil analiz" backend'idir.  
> Amaç: aday verisini güvenli al, skoru üret, sistemi gözlemlenebilir ve test edilebilir tut.

---

## 0) Ne Çözüyor?

- GitHub username üzerinden analiz raporu üretir.
- CV dosyası upload eder, kullanıcıya bağlı saklar.
- JWT ile kimlik doğrulama + yetkilendirme yapar.
- Worker ile periyodik sistem metriklerini ve heartbeat bilgisini üretir.
- Health endpointleri ile API + Worker + DB durumunu dışarı açar.

---

## 1) Sistem Haritası

```text
Client (Web/Mobile)
   |
   v
YGA.API (ASP.NET Core)
  |-- Auth (JWT)
  |-- Analyze / Reports
  |-- CV Upload
  |-- Health endpoints
   |
   v
PostgreSQL (EF Core / AppDbContext)
   ^
   |
YGA.Worker (BackgroundService)
  |-- Periodic metrics log
  |-- worker_heartbeats upsert
```

---

## 2) Teknoloji Omurgası

- `.NET 8`
- `ASP.NET Core Web API`
- `Entity Framework Core + Npgsql`
- `PostgreSQL`
- `xUnit`
- `GitHub Actions` (CI: restore/build/test)

---

## 3) Hızlı Başlangıç (5 Dakika)

### 3.1 Ortam Değişkenleri

`.env.example` içeriğini baz al:

```env
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=yga_db;Username=postgres;Password=your_strong_password
Jwt__Issuer=YGA.API
Jwt__Audience=YGA.Client
Jwt__ExpiresMinutes=120
Jwt__Key=replace_with_a_long_random_secret_key_min_32_chars
Github__ApiToken=
Worker__StatsIntervalSeconds=60
```

### 3.2 Build + Migration + Run

```bash
dotnet restore YGA.sln
dotnet build YGA.sln
dotnet ef database update --project YGA.Infrastructure --startup-project YGA.API
dotnet run --project YGA.API
```

Worker için:

```bash
dotnet run --project YGA.Worker
```

Swagger: `http://localhost:5105/swagger`

---

## 4) API Akışı (Pratik)

### 4.1 Register

`POST /api/v1/auth/register`

```json
{
  "email": "user@test.dev",
  "password": "StrongPass123!"
}
```

### 4.2 Login

`POST /api/v1/auth/login` -> `token` döner.

### 4.3 Analyze (Authorize gerekli)

`POST /api/v1/analyze/github`  
Header: `Authorization: Bearer <token>`

```json
{
  "username": "torvalds"
}
```

### 4.4 Report

`GET /api/v1/reports/{reportId}`  
Header: `Authorization: Bearer <token>`

---

## 5) Health & Operasyon

### Endpointler

- `GET /api/v1/health/live`
  - API process ayakta mı? (`Alive`)
- `GET /api/v1/health/worker`
  - Worker heartbeat güncel mi?
- `GET /api/v1/health`
  - Toplam sistem sağlığı (DB + Worker kombine)

### Beklenen davranış

- `200`: Sağlıklı
- `503`: En az bir kritik bileşen sağlıksız

---

## 6) Skorlama Mantığı (Mevcut v1)

Analiz skoru GitHub profile JSON alanlarından üretilir:

- `ProfileCompleteness`: `name`, `bio`, `blog`, `location`, `company`
- `RepositoryActivity`: `public_repos`, `followers`, `public_gists`
- `CodeQuality`: `public_repos`, `followers`, `following` bazlı heuristik

> Not: Bu sürüm profile-level heuristik kullanır.  
> Repo-level commit/code incelemesi sonraki iterasyon hedefidir.

---

## 7) Logging & Traceability

- API ve Worker JSON structured log üretir.
- `X-Correlation-Id` request/response hattında taşınır.
- Request başlangıç/bitiş ve status code loglanır.
- Global exception middleware standart JSON hata gövdesi döner.

---

## 8) Test Stratejisi

Çalıştır:

```bash
dotnet test YGA.sln
```

Mevcut test kapsamı:

- `CandidateReportService` (dinamik skor + include doğrulaması)
- `GlobalExceptionMiddleware` (status mapping)
- `AuthService` (register/login)
- `RequestContextMiddleware` (correlation id)

---

## 9) CI Kuralı

`.github/workflows/ci.yml` her push/PR'da şunları zorunlu çalıştırır:

1. Restore
2. Build
3. Test

Bu sayede "çalışmayan kod" main'e yaklaşamaz.

---

## 10) Yol Haritası (Net)

- Repo-level gerçek kalite metrikleri
- Health threshold'larını env/config ile yönetme
- Integration testleri auth+upload+ownership+health senaryolarıyla genişletme
- Dashboard/alert entegrasyonu (opsiyonel)

---

## 11) Kısa Not

Bu README, "nasıl çalıştırırım?" dokümanından çok  
"sistemi nasıl yönetirim ve geliştiririm?" dokümanı olacak şekilde tasarlanmıştır.
