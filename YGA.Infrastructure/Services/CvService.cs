// ============================================================================
// CvService.cs — CV Dosyası Yükleme ve Sorgulama Servisi
// ============================================================================
// Bu sınıf, kullanıcıların CV (PDF/DOCX) dosyalarını yüklemesini sağlar.
//
// Nasıl çalışır?
// 1) Frontend'den bir PDF/DOCX dosyası gelir
// 2) Dosya sunucudaki "uploads/cvs/" klasörüne fiziksel olarak kaydedilir
// 3) Veritabanına sadece dosyanın YOLU kaydedilir (dosyanın kendisi DB'de değil!)
// 4) Böylece dosya hem diskte güvende, hem de DB'den sorgulanabilir
//
// Neden dosyayı DB'ye kaydetmiyoruz?
// - PDF dosyaları büyük olabilir (5-10 MB)
// - Veritabanını şişirir ve yavaşlatır
// - Dosya sisteminden okumak çok daha hızlı
// ============================================================================

using YGA.Application.Interfaces;     // ICvService, IRepository
using YGA.Domain;                     // CvDocument, User
using YGA.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace YGA.Infrastructure.Services;

/// <summary>
/// CV dosyası yükleme ve sorgulama servisi.
/// ICvService interface'ini implement eder.
/// </summary>
public class CvService : ICvService
{
    private readonly IRepository<CvDocument> _cvRepo;   // cv_documents tablosu CRUD
    private readonly IRepository<User> _userRepo;       // users tablosu CRUD (kullanıcı kontrolü için)
    private readonly AppDbContext _dbContext;             // Pagination sorguları için
    private readonly string _uploadPath;                 // Dosyaların kaydedileceği klasör yolu

    // Constructor — DI ile repository'ler otomatik gelir.
    public CvService(IRepository<CvDocument> cvRepo, IRepository<User> userRepo, AppDbContext dbContext)
    {
        _cvRepo = cvRepo;
        _userRepo = userRepo;
        _dbContext = dbContext;

        // Uploads klasörünü oluştur (yoksa)
        // Path.Combine = Yol birleştirme. Örnek: "C:\proje\uploads\cvs"
        // Directory.GetCurrentDirectory() = Uygulamanın çalıştığı klasör
        _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "cvs");
        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);   // Klasör yoksa oluştur
        }
    }

    /// <summary>
    /// CV dosyasını diske kaydeder ve veritabanına yolunu yazar.
    /// 
    /// Adım adım:
    /// 1) Kullanıcı var mı kontrol et
    /// 2) Dosyaya benzersiz isim ver (çakışma olmasın)
    /// 3) Dosyayı fiziksel olarak diske yaz
    /// 4) Veritabanına dosya bilgilerini kaydet
    /// </summary>
    /// <param name="userId">Dosyayı yükleyen kullanıcının ID'si</param>
    /// <param name="fileName">Orijinal dosya adı (örnek: "furkan_cv.pdf")</param>
    /// <param name="fileStream">Dosyanın içeriği (byte akışı)</param>
    /// <returns>Oluşturulan CvDocument kaydı</returns>
    public async Task<CvDocument> UploadCvAsync(Guid userId, string fileName, Stream fileStream, CancellationToken ct = default)
    {
        // ================================================================
        // ADIM 1: Kullanıcı kontrolü
        // ================================================================
        // Veritabanında bu kullanıcı var mı? Yoksa oluştur.
        // (İleride authentication eklenince bu adım gereksiz olacak)
        var existingUser = await _userRepo.GetByIdAsync(userId, ct);
        if (existingUser == null)
        {
            throw new InvalidOperationException("Kullanıcı bulunamadı.");
        }

        // ================================================================
        // ADIM 2: Benzersiz dosya adı oluştur
        // ================================================================
        // Neden benzersiz ad? İki kullanıcı da "cv.pdf" yüklerse dosya üzerine yazılır!
        // Guid ekleyerek çakışmayı önlüyoruz.
        // Örnek: "a3b2c1d4_furkan_cv.pdf"
        var safeFileName = SanitizeFileName(fileName);
        var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";
        var filePath = Path.Combine(_uploadPath, uniqueFileName);

        // ================================================================
        // ADIM 3: Dosyayı diske kaydet
        // ================================================================
        // FileStream = Dosya yazma akışı. FileMode.Create = Yeni dosya oluştur.
        // CopyToAsync = Gelen veriyi (fileStream) hedef dosyaya (output) kopyala.
        // using = İşlem bitince FileStream'i otomatik kapat (bellek sızıntısını önler).
        using (var output = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(output, ct);
        }

        // ================================================================
        // ADIM 4: Veritabanına dosya bilgilerini kaydet
        // ================================================================
        // Dosyanın KENDİSİ DB'de değil! Sadece "dosya nerede, adı ne, ne zaman yüklendi" bilgisi var.
        var cvDocument = new CvDocument
        {
            Id = Guid.NewGuid(),            // Benzersiz kayıt ID'si
            UserId = userId,                // Kim yükledi?
            FileName = safeFileName,        // Güvenli dosya adı
            FilePath = filePath,            // Diskteki tam yol: "C:\proje\uploads\cvs\abc_furkan_cv.pdf"
            UploadedAt = DateTime.UtcNow    // Ne zaman yüklendi?
        };

        await _cvRepo.AddAsync(cvDocument, ct);      // Hafızaya ekle
        await _cvRepo.SaveChangesAsync(ct);           // Veritabanına yaz

        return cvDocument;
    }

    private static string SanitizeFileName(string fileName)
    {
        var justFileName = Path.GetFileName(fileName);
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(justFileName
            .Select(c => invalidChars.Contains(c) ? '_' : c)
            .ToArray());

        return string.IsNullOrWhiteSpace(sanitized) ? "cv_upload" : sanitized;
    }

    /// <summary>
    /// Belirli bir kullanıcının yüklediği tüm CV'leri listele.
    /// Örnek: "Bu kullanıcı kaç CV yüklemiş?" sorusuna cevap verir.
    /// </summary>
    public async Task<IEnumerable<CvDocument>> GetCvsByUserAsync(Guid userId, CancellationToken ct = default)
    {
        return await _cvRepo.FindAsync(cv => cv.UserId == userId, ct);
    }

    /// <summary>
    /// Belirli bir kullanıcının CV'lerini sayfalı olarak getirir.
    /// Skip/Take ile veritabanı seviyesinde sayfalama yapılır.
    /// </summary>
    public async Task<(IEnumerable<CvDocument> Items, int TotalCount)> GetCvsByUserPagedAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _dbContext.CvDocuments
            .AsNoTracking()
            .Where(cv => cv.UserId == userId)
            .OrderByDescending(cv => cv.UploadedAt);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }
}
