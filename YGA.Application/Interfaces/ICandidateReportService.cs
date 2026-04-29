using YGA.Domain;

namespace YGA.Application.Interfaces;

/// <summary>
/// GitHub analizi ve rapor oluşturma işlemlerini tanımlayan servis arayüzü.
/// </summary>
public interface ICandidateReportService
{
    /// <summary>
    /// Verilen GitHub kullanıcı adını analiz eder, profil bilgilerini çeker,
    /// skorları hesaplar ve raporu veritabanına kaydeder.
    /// </summary>
    Task<CandidateReport> AnalyzeGithubAsync(Guid userId, string githubUsername, CancellationToken ct = default);

    /// <summary>
    /// Belirli bir kullanıcının tüm raporlarını getirir.
    /// </summary>
    Task<IEnumerable<CandidateReport>> GetReportsByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Belirli bir kullanıcının raporlarını sayfalı olarak getirir.
    /// </summary>
    Task<(IEnumerable<CandidateReport> Items, int TotalCount)> GetReportsByUserPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);

    /// <summary>
    /// ID ile belirli bir raporu getirir.
    /// </summary>
    Task<CandidateReport?> GetReportByIdAsync(Guid reportId, CancellationToken ct = default);
}
