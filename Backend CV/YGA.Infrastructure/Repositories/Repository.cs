// ============================================================================
// Repository.cs — Generic Repository Implementasyonu (Veritabanı CRUD İşlemleri)
// ============================================================================
// Bu sınıf, veritabanındaki tüm tablolar için ortak işlemleri sağlar.
//
// CRUD nedir?
// C = Create (Oluştur)  → AddAsync
// R = Read (Oku)        → GetByIdAsync, GetAllAsync, FindAsync
// U = Update (Güncelle) → Update
// D = Delete (Sil)      → Remove
//
// Generic (T) nedir?
// T yerine herhangi bir entity sınıfı gelebilir: User, GithubProfile, CvDocument...
// Böylece her entity için ayrı repository yazmak yerine tek bir sınıf kullanırız.
// Örnek: Repository<User> = User tablosu için CRUD
//        Repository<CvDocument> = CvDocument tablosu için CRUD
// ============================================================================

using System.Linq.Expressions;             // FindAsync'teki lambda ifadeler için
using Microsoft.EntityFrameworkCore;       // EF Core veritabanı işlemleri
using YGA.Application.Interfaces;          // IRepository<T> interface'i
using YGA.Infrastructure.Data;             // AppDbContext

namespace YGA.Infrastructure.Repositories;

/// <summary>
/// EF Core tabanlı generic repository.
/// IRepository interface'ini implement eder (gerçek kodu yazar).
/// </summary>
public class Repository<T> : IRepository<T> where T : class
{
    // _context = Veritabanı bağlamımız. Tüm tablolara buradan erişiriz.
    protected readonly AppDbContext _context;

    // _dbSet = T tipindeki entity'nin tablosu.
    // Örnek: T = User ise, _dbSet = _context.Users tablosu demek.
    protected readonly DbSet<T> _dbSet;

    // Constructor — DI (Dependency Injection) ile AppDbContext otomatik gelir.
    public Repository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();  // T'ye karşılık gelen tabloyu al
    }

    // ============================================================================
    // READ — Veri Okuma İşlemleri
    // ============================================================================

    /// <summary>
    /// ID ile tek bir kayıt getir.
    /// Örnek: _userRepo.GetByIdAsync(userId) → O ID'ye sahip kullanıcıyı döner.
    /// Bulamazsa null döner.
    /// </summary>
    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        // FindAsync = Veritabanında bu ID'yi ara, bulursan getir
        return await _dbSet.FindAsync(new object[] { id }, ct);
    }

    /// <summary>
    /// Tablodaki TÜM kayıtları getir.
    /// Örnek: _userRepo.GetAllAsync() → Tüm kullanıcıların listesini döner.
    /// DİKKAT: Büyük tablolarda dikkatli kullan, çok fazla veri gelebilir!
    /// </summary>
    public async Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default)
    {
        // ToListAsync = Tüm kayıtları çek ve liste olarak döndür
        return await _dbSet.ToListAsync(ct);
    }

    /// <summary>
    /// Belirli bir koşula uyan kayıtları getir (filtreleme).
    /// Örnek: _reportRepo.FindAsync(r => r.UserId == userId)
    ///   → Bu kullanıcıya ait tüm raporları getir.
    /// 
    /// predicate = Koşul. Lambda ifade olarak yazılır.
    ///   r => r.UserId == userId  → "UserId'si bu olan kayıtları getir" demek.
    /// </summary>
    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    {
        // Where = SQL'deki WHERE gibi, koşula uyan kayıtları filtrele
        return await _dbSet.Where(predicate).ToListAsync(ct);
    }

    // ============================================================================
    // CREATE — Yeni Kayıt Ekleme
    // ============================================================================

    /// <summary>
    /// Veritabanına yeni bir kayıt ekle.
    /// DİKKAT: Bu metot sadece "eklenecek" olarak işaretler.
    /// Gerçekten veritabanına yazmak için SaveChangesAsync() çağrılmalıdır!
    /// 
    /// Örnek:
    ///   await _userRepo.AddAsync(newUser);        // Hafızada işaretle
    ///   await _userRepo.SaveChangesAsync();       // Veritabanına yaz
    /// </summary>
    public async Task AddAsync(T entity, CancellationToken ct = default)
    {
        await _dbSet.AddAsync(entity, ct);
    }

    // ============================================================================
    // UPDATE — Kayıt Güncelleme
    // ============================================================================

    /// <summary>
    /// Mevcut bir kaydı güncelle.
    /// Önce kaydı getir, değişiklikleri yap, sonra SaveChangesAsync çağır.
    /// 
    /// Örnek:
    ///   var user = await _userRepo.GetByIdAsync(id);
    ///   user.Email = "yeni@email.com";
    ///   _userRepo.Update(user);
    ///   await _userRepo.SaveChangesAsync();
    /// </summary>
    public void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    // ============================================================================
    // DELETE — Kayıt Silme
    // ============================================================================

    /// <summary>
    /// Bir kaydı sil.
    /// Yine SaveChangesAsync() çağrılana kadar gerçekleşmez.
    /// 
    /// Örnek:
    ///   var user = await _userRepo.GetByIdAsync(id);
    ///   _userRepo.Remove(user);
    ///   await _userRepo.SaveChangesAsync();
    /// </summary>
    public void Remove(T entity)
    {
        _dbSet.Remove(entity);
    }

    // ============================================================================
    // SAVE — Değişiklikleri Veritabanına Yaz
    // ============================================================================

    /// <summary>
    /// Bekleyen tüm değişiklikleri (Add, Update, Remove) veritabanına yaz.
    /// Bu metot çağrılmadan hiçbir değişiklik kalıcı olmaz!
    /// 
    /// EF Core "Unit of Work" pattern'i kullanır:
    /// - Birden fazla işlem yaparsın (Add, Update, Remove)
    /// - SaveChangesAsync ile hepsini tek seferde veritabanına yazarsın
    /// - Hata olursa hiçbiri yazılmaz (transaction güvenliği)
    /// </summary>
    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
