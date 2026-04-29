using YGA.Domain;

namespace YGA.Application.Interfaces;

/// <summary>
/// CV dosyası yükleme ve sorgulama işlemlerini tanımlayan servis arayüzü.
/// </summary>
public interface ICvService
{
    /// <summary>
    /// CV dosyasını diske kaydeder ve veritabanına kaydını oluşturur.
    /// </summary>
    Task<CvDocument> UploadCvAsync(Guid userId, string fileName, Stream fileStream, CancellationToken ct = default);

    /// <summary>
    /// Belirli bir kullanıcının tüm CV'lerini getirir.
    /// </summary>
    Task<IEnumerable<CvDocument>> GetCvsByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Belirli bir kullanıcının CV'lerini sayfalı olarak getirir.
    /// </summary>
    Task<(IEnumerable<CvDocument> Items, int TotalCount)> GetCvsByUserPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
}
