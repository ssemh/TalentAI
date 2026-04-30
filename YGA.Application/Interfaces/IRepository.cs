// ============================================================================
// IRepository.cs — Generic Repository Arayüzü (Interface)
// ============================================================================
// Interface (Arayüz) = "Bu işleri yapabilen birisi lazım" demek.
// Gerçek kodu YAZMIYORSUN, sadece "şu metotlar olmalı" diye kural koyuyorsun.
//
// Neden interface kullanıyoruz?
// Clean Architecture'da üst katmanlar (Application) alt katmanları (Infrastructure) bilmemeli.
// Application katmanı sadece "bana bir repository lazım" der (IRepository).
// Infrastructure katmanı gerçek kodu yazar (Repository<T>).
// Bu sayede ileride veritabanını değiştirmek istersen (mesela MongoDB'ye geçiş)
// sadece Infrastructure katmanını değiştirirsin, Application katmanı etkilenmez.
//
// Generic (T) = Herhangi bir entity tipi gelebilir.
// IRepository<User>    → User tablosu için CRUD
// IRepository<CvDocument> → CvDocument tablosu için CRUD
// ============================================================================

using System.Linq.Expressions;

namespace YGA.Application.Interfaces;

/// <summary>
/// Tüm entity'ler için ortak CRUD işlemlerini tanımlayan generic repository arayüzü.
/// Infrastructure katmanında EF Core ile implement edilecektir.
/// </summary>
public interface IRepository<T> where T : class   // "T, bir class olmak zorunda" kısıtlaması
{
    // ID ile tek kayıt getir. Bulamazsa null döner (T? = nullable).
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Tablodaki TÜM kayıtları getir.
    Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default);

    // Koşula uyan kayıtları getir.
    // Expression<Func<T, bool>> = Lambda ifade. Örnek: u => u.Email == "x"
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    // Yeni kayıt ekle (SaveChangesAsync çağrılana kadar DB'ye yazılmaz!)
    Task AddAsync(T entity, CancellationToken ct = default);

    // Mevcut kaydı güncelle
    void Update(T entity);

    // Kaydı sil
    void Remove(T entity);

    // Bekleyen tüm değişiklikleri veritabanına yaz
    Task SaveChangesAsync(CancellationToken ct = default);
}
