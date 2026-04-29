// ============================================================================
// GithubController.cs — GitHub Analiz API Endpoint'leri
// ============================================================================
// Controller = Restoran garsonu gibi düşün.
// 
// Müşteri (Frontend/React) sipariş verir → Garson (Controller) alır →
// Mutfağa (Service) iletir → Yemek (Veri) gelince müşteriye taşır.
//
// Bu controller'da 2 endpoint var:
// 1) POST /api/v1/analyze/github  → GitHub kullanıcı adı analiz et
// 2) GET  /api/v1/reports/{id}    → Rapor detayı getir
//
// [ApiController] = "Bu sınıf bir API Controller'ıdır" demek.
// [Route("api/v1")] = "Bu controller'daki tüm endpoint'ler api/v1/ ile başlar" demek.
// ControllerBase = API controller'larının temel sınıfı (Ok, BadRequest gibi metodları sağlar)
// ============================================================================

using Microsoft.AspNetCore.Mvc;        // Controller, ActionResult, HttpPost vb.
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using YGA.Application.DTOs;            // AnalyzeGithubRequest, AnalyzeGithubResponse
using YGA.Application.Interfaces;      // ICandidateReportService

namespace YGA.API.Controllers;

[ApiController]                         // Bu sınıfın bir API Controller olduğunu belirt
[Route("api/v1")]                       // Tüm endpoint'ler "api/v1/" ile başlasın
public class GithubController : ApiControllerBase
{
    // Bu controller'ın kullanacağı bağımlılıklar
    private readonly ICandidateReportService _reportService;  // Analiz iş mantığı
    private readonly ILogger<GithubController> _logger;       // Log (kayıt) yazma servisi

    // Constructor — DI ile otomatik gelir.
    // .NET, GithubController oluşturulurken _reportService ve _logger'ı otomatik doldurur.
    public GithubController(ICandidateReportService reportService, ILogger<GithubController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    // ============================================================================
    // ENDPOINT 1: POST /api/v1/analyze/github
    // ============================================================================
    // Frontend şunu gönderir:
    //   POST http://localhost:5105/api/v1/analyze/github
    //   Body: { "username": "torvalds" }
    //
    // Backend şunu döner:
    //   { "reportId": "...", "scores": [...], "message": "Başarıyla analiz edildi" }
    //
    // [HttpPost("analyze/github")] = Bu metot POST isteklerini "api/v1/analyze/github" adresinde karşılar
    // [FromBody] = İstek gövdesinden (body) JSON olarak veriyi al
    // CancellationToken = İstek iptal edilirse (kullanıcı sayfayı kapatırsa) işlemi durdur
    // ============================================================================

    /// <summary>
    /// GitHub kullanıcı adını analiz eder, profil bilgilerini çeker ve rapor oluşturur.
    /// </summary>
    [HttpPost("analyze/github")]
    [Authorize]
    [EnableRateLimiting("github")]          // Dakikada maks 5 analiz isteği (GitHub API pahalı)
    [ProducesResponseType(typeof(AnalyzeGithubResponse), StatusCodes.Status200OK)]         // Başarılıysa 200 döner
    [ProducesResponseType(StatusCodes.Status400BadRequest)]                                // Hatalı istekse 400 döner
    public async Task<IActionResult> AnalyzeGithub([FromBody] AnalyzeGithubRequest request, CancellationToken ct)
    {
        // ---- DOĞRULAMA (Validation) ----
        // Kullanıcı adı boş mu kontrol et. Boşsa hata döndür, devam etme.
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            // BadRequest = 400 HTTP durum kodu. "Hatalı istek" demek.
            return BadRequest(new { message = "GitHub kullanıcı adı boş olamaz." });
        }

        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Geçerli kullanıcı bilgisi bulunamadı." });
        }

        _logger.LogInformation("GitHub analizi başlatılıyor: {Username}", request.Username);
        var report = await _reportService.AnalyzeGithubAsync(userId.Value, request.Username, ct);

        var response = new AnalyzeGithubResponse
        {
            ReportId = report.Id,
            GithubUsername = request.Username,
            CreatedAt = report.CreatedAt,
            Scores = report.Scores.Select(s => new ScoreDto
            {
                Name = s.Name,
                Value = s.Value
            }).ToList(),
            Message = "GitHub profili başarıyla analiz edildi."
        };

        return Ok(response);
    }

    // ============================================================================
    // ENDPOINT 2: GET /api/v1/reports/{reportId}
    // ============================================================================
    // Frontend şunu gönderir:
    //   GET http://localhost:5105/api/v1/reports/abc-123-def-456
    //
    // {reportId:guid} = URL'deki değeri Guid formatında al
    // ============================================================================

    /// <summary>
    /// Belirli bir raporu ID ile getirir.
    /// </summary>
    [HttpGet("reports/{reportId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(AnalyzeGithubResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]        // Bulunamazsa 404 döner
    public async Task<IActionResult> GetReport(Guid reportId, CancellationToken ct)
    {
        var currentUserId = GetUserId();
        if (currentUserId is null)
        {
            return Unauthorized(new { message = "Geçerli kullanıcı bilgisi bulunamadı." });
        }

        // ID ile raporu ara
        var report = await _reportService.GetReportByIdAsync(reportId, ct);

        // Rapor bulunamadıysa 404 döndür
        if (report == null)
        {
            // NotFound = 404. "Aradığın şey bulunamadı" demek.
            return NotFound(new { message = "Rapor bulunamadı." });
        }

        if (report.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        // Rapor bulunduysa DTO'ya dönüştürüp döndür
        var response = new AnalyzeGithubResponse
        {
            ReportId = report.Id,
            GithubUsername = report.GithubProfile?.Username ?? "Bilinmiyor",  // ?. = null kontrolü
            CreatedAt = report.CreatedAt,
            Scores = report.Scores.Select(s => new ScoreDto
            {
                Name = s.Name,
                Value = s.Value
            }).ToList(),
            Message = "Rapor başarıyla getirildi."
        };

        return Ok(response);
    }

    // ============================================================================
    // ENDPOINT 3: GET /api/v1/reports?page=1&pageSize=10
    // ============================================================================
    // Giriş yapmış kullanıcının tüm raporlarını sayfalı olarak listeler.
    // ============================================================================

    /// <summary>
    /// Giriş yapmış kullanıcının tüm raporlarını sayfalı olarak listeler.
    /// </summary>
    [HttpGet("reports")]
    [Authorize]
    [ProducesResponseType(typeof(PagedResponse<AnalyzeGithubResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyReports(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Geçerli kullanıcı bilgisi bulunamadı." });
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var (items, totalCount) = await _reportService.GetReportsByUserPagedAsync(userId.Value, page, pageSize, ct);

        var response = new PagedResponse<AnalyzeGithubResponse>
        {
            Items = items.Select(r => new AnalyzeGithubResponse
            {
                ReportId = r.Id,
                GithubUsername = r.GithubProfile?.Username ?? "Bilinmiyor",
                CreatedAt = r.CreatedAt,
                Scores = r.Scores.Select(s => new ScoreDto { Name = s.Name, Value = s.Value }).ToList(),
                Message = "OK"
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(response);
    }

}
