// ============================================================================
// CvController.cs — CV Dosyası Yükleme API Endpoint'leri
// ============================================================================
// Bu controller, kullanıcıların CV (PDF/DOCX) dosyalarını yüklemesini sağlar.
//
// 2 endpoint var:
// 1) POST /api/v1/upload-cv     → CV dosyası yükle
// 2) GET  /api/v1/cvs/{userId}  → Kullanıcının CV'lerini listele
//
// POST isteği "multipart/form-data" formatında gelir (dosya yükleme standardı).
// Normal JSON değil! Tarayıcıda <form> ile dosya yüklemek gibi düşün.
// ============================================================================

using Microsoft.AspNetCore.Mvc;        // Controller, IFormFile, HttpPost vb.
using Microsoft.AspNetCore.Authorization;
using YGA.Application.DTOs;            // UploadCvResponse DTO
using YGA.Application.Interfaces;      // ICvService

namespace YGA.API.Controllers;

[ApiController]
[Route("api/v1")]
public class CvController : ApiControllerBase
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;
    private static readonly string[] AllowedExtensions = [".pdf", ".docx", ".doc"];
    private static readonly string[] AllowedMimeTypes =
    [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    private readonly ICvService _cvService;              // CV iş mantığı servisi
    private readonly ILogger<CvController> _logger;      // Log servisi

    // Constructor — DI ile otomatik gelir
    public CvController(ICvService cvService, ILogger<CvController> logger)
    {
        _cvService = cvService;
        _logger = logger;
    }

    // ============================================================================
    // ENDPOINT 1: POST /api/v1/upload-cv
    // ============================================================================
    // Frontend'den dosya yükleme isteği gelir.
    // 
    // IFormFile = ASP.NET Core'un dosya yükleme mekanizması.
    // Frontend bir <input type="file"> veya FormData ile dosya gönderir,
    // ASP.NET Core otomatik olarak IFormFile nesnesine dönüştürür.
    //
    // [FromForm] = Veriyi form-data'dan al (JSON'dan değil!)
    // [RequestSizeLimit] = Maksimum dosya boyutu (10 MB = 10 * 1024 * 1024 byte)
    // ============================================================================

    /// <summary>
    /// CV dosyasını yükler. Dosya diske kaydedilir, bilgisi veritabanına yazılır.
    /// </summary>
    [HttpPost("upload-cv")]
    [Authorize]
    [ProducesResponseType(typeof(UploadCvResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [RequestSizeLimit(MaxFileSizeBytes)]    // Maksimum 10 MB dosya boyutu
    public async Task<IActionResult> UploadCv(IFormFile file, CancellationToken ct)
    {
        // ---- DOĞRULAMA 1: Dosya var mı? ----
        // file == null = Hiç dosya gönderilmemiş
        // file.Length == 0 = Dosya gönderilmiş ama içi boş
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Dosya seçilmedi veya dosya boş." });
        }

        // ---- DOĞRULAMA 2: Dosya uzantısı uygun mu? ----
        // Sadece PDF ve Word dosyalarını kabul ediyoruz.
        // Güvenlik açısından önemli: Birisi .exe veya .bat yüklemeye çalışabilir!
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();  // ".PDF" → ".pdf"
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Sadece PDF ve DOCX dosyaları kabul edilir." });
        }

        if (!AllowedMimeTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Dosya tipi geçersiz." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { message = "Dosya boyutu 10 MB sınırını aşıyor." });
        }

        var actualUserId = GetUserId();
        if (actualUserId is null)
        {
            return Unauthorized(new { message = "Geçerli kullanıcı bilgisi bulunamadı." });
        }

        _logger.LogInformation("CV yükleniyor: {FileName}, Boyut: {Size} bytes", file.FileName, file.Length);
        using var stream = file.OpenReadStream();
        var cvDocument = await _cvService.UploadCvAsync(actualUserId.Value, file.FileName, stream, ct);

        var response = new UploadCvResponse
        {
            DocumentId = cvDocument.Id,
            FileName = cvDocument.FileName,
            UploadedAt = cvDocument.UploadedAt,
            Message = "CV başarıyla yüklendi."
        };

        return Ok(response);
    }

    // ============================================================================
    // ENDPOINT 2: GET /api/v1/cvs/{userId}?page=1&pageSize=10
    // ============================================================================
    // Belirli bir kullanıcının yüklediği CV'leri sayfalı olarak listeler.
    // page ve pageSize query parametreleri opsiyoneldir.
    // Default: page=1, pageSize=10
    //
    // Örnek: GET http://localhost:5105/api/v1/cvs/abc-123?page=2&pageSize=5
    // ============================================================================

    /// <summary>
    /// Belirli bir kullanıcının yüklediği CV'leri sayfalı olarak listeler.
    /// </summary>
    [HttpGet("cvs/{userId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(PagedResponse<UploadCvResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCvsByUser(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var currentUserId = GetUserId();
        if (currentUserId is null || currentUserId.Value != userId)
        {
            return Forbid();
        }

        // Sayfa numarası ve boyutunu sınırla
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var (items, totalCount) = await _cvService.GetCvsByUserPagedAsync(userId, page, pageSize, ct);

        var response = new PagedResponse<UploadCvResponse>
        {
            Items = items.Select(cv => new UploadCvResponse
            {
                DocumentId = cv.Id,
                FileName = cv.FileName,
                UploadedAt = cv.UploadedAt,
                Message = "OK"
            }).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(response);
    }

}

