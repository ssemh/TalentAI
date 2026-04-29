// ============================================================================
// Contracts.cs — DTO'lar (Data Transfer Objects)
// ============================================================================
// DTO = Veri Taşıma Nesnesi.
// Frontend ile backend arasında gidip gelen verilerin formatını belirler.
//
// Neden DTO kullanıyoruz? Neden doğrudan entity (User, CandidateReport) göndermiyoruz?
// 1) Entity'de gereksiz alanlar var (navigation property'ler, internal ID'ler)
// 2) Frontend'e sadece ihtiyacı olan veriyi göndermek istiyoruz
// 3) Güvenlik — Entity'deki hassas verileri (şifre vb.) yanlışlıkla göndermemek için
//
// Request DTO  = Frontend'DEN gelen veri formatı  (istek)
// Response DTO = Frontend'E gönderilen veri formatı (yanıt)
// ============================================================================

using System.ComponentModel.DataAnnotations;   // [Required] gibi doğrulama attribute'ları

namespace YGA.Application.DTOs;

// ==================== GITHUB ANALİZ DTO'LARI ====================

/// <summary>
/// POST /api/v1/analyze/github endpoint'ine gönderilen istek formatı.
/// 
/// Frontend şunu gönderir:
/// {
///     "username": "torvalds",
///     "userId": null           ← opsiyonel
/// }
/// </summary>
public class AnalyzeGithubRequest
{
    /// <summary>
    /// Analiz edilecek GitHub kullanıcı adı.
    /// [Required] = Bu alan zorunlu! Boş gönderilirse otomatik 400 hatası döner.
    /// </summary>
    [Required(ErrorMessage = "GitHub kullanıcı adı zorunludur.")]
    public string Username { get; set; } = string.Empty;
}

/// <summary>
/// GitHub analiz sonucu olarak frontend'e döndürülen yanıt formatı.
/// 
/// Backend şunu döner:
/// {
///     "reportId": "abc-123",
///     "githubUsername": "torvalds",
///     "createdAt": "2026-04-24T14:39:07Z",
///     "scores": [
///         { "name": "CodeQuality", "value": 70 },
///         { "name": "ProfileCompleteness", "value": 75 }
///     ],
///     "message": "GitHub profili başarıyla analiz edildi."
/// }
/// </summary>
public class AnalyzeGithubResponse
{
    public Guid ReportId { get; set; }                          // Oluşturulan raporun ID'si
    public string GithubUsername { get; set; } = string.Empty;  // Analiz edilen kullanıcı adı
    public DateTime CreatedAt { get; set; }                     // Raporun oluşturulma zamanı
    public List<ScoreDto> Scores { get; set; } = new();         // Analiz skorları listesi
    public string Message { get; set; } = string.Empty;        // Bilgi mesajı
}

/// <summary>
/// Tek bir skor metriğini temsil eden DTO.
/// Örnek: { "name": "CodeQuality", "value": 70 }
/// </summary>
public class ScoreDto
{
    public string Name { get; set; } = string.Empty;   // Skor adı: "CodeQuality", "ProfileCompleteness"
    public double Value { get; set; }                   // Skor değeri: 0-100 arası
}

// ==================== CV YÜKLEME DTO'LARI ====================

/// <summary>
/// POST /api/v1/upload-cv endpoint'inin yanıt formatı.
/// 
/// NOT: İstek (request) için ayrı DTO yok çünkü dosya yükleme
/// multipart/form-data formatında gelir. ASP.NET Core bunu
/// IFormFile parametresiyle otomatik olarak alır.
/// 
/// Backend şunu döner:
/// {
///     "documentId": "abc-123",
///     "fileName": "furkan_cv.pdf",
///     "uploadedAt": "2026-04-24T15:00:00Z",
///     "message": "CV başarıyla yüklendi."
/// }
/// </summary>
public class UploadCvResponse
{
    public Guid DocumentId { get; set; }                        // CV kaydının benzersiz ID'si
    public string FileName { get; set; } = string.Empty;       // Orijinal dosya adı
    public DateTime UploadedAt { get; set; }                    // Yüklenme zamanı
    public string Message { get; set; } = string.Empty;        // Bilgi mesajı
}

// ==================== AUTH DTO'LARI ====================

public class RegisterRequest
{
    [Required(ErrorMessage = "Email zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir email girilmelidir.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [MinLength(8, ErrorMessage = "Şifre en az 8 karakter olmalıdır.")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required(ErrorMessage = "Email zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir email girilmelidir.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre zorunludur.")]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
}

// ==================== PAGINATION DTO'LARI ====================

/// <summary>
/// Sayfalı liste yanıtı için generic wrapper.
/// Her sayfalı endpoint bu formatta döner.
/// 
/// Örnek yanıt:
/// {
///   "items": [ ... ],
///   "page": 1,
///   "pageSize": 10,
///   "totalCount": 47,
///   "totalPages": 5,
///   "hasNextPage": true,
///   "hasPreviousPage": false
/// }
/// </summary>
public class PagedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}

