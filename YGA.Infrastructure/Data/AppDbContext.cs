// ============================================================================
// AppDbContext.cs — Veritabanı Bağlamı (Database Context)
// ============================================================================
// Bu sınıf, uygulamamız ile PostgreSQL veritabanı arasındaki "köprü"dür.
// 
// Ne yapar?
// - Hangi tabloların olacağını tanımlar (DbSet'ler)
// - Tablolar arası ilişkileri belirler (foreign key'ler)
// - Kolon kısıtlamalarını ayarlar (max uzunluk, zorunlu alan, unique index vb.)
//
// EF Core nasıl çalışır?
// - Sen C# sınıfları yazarsın (User, GithubProfile vb.)
// - EF Core bunları otomatik olarak PostgreSQL tablolarına dönüştürür
// - SQL yazmana gerek kalmaz, C# koduyla veritabanı işlemleri yaparsın
// ============================================================================

using Microsoft.EntityFrameworkCore;
using YGA.Domain;

namespace YGA.Infrastructure.Data;

/// <summary>
/// Uygulamanın ana veritabanı bağlamı.
/// DbContext = EF Core'un veritabanıyla konuşmasını sağlayan temel sınıf.
/// Bu sınıf DbContext'ten türetilir (inherit eder).
/// </summary>
public class AppDbContext : DbContext
{
    // Constructor — Program.cs'den gelen veritabanı ayarlarını (connection string vb.) alır.
    // base(options) = üst sınıfa (DbContext) bu ayarları ilet.
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ============================================================================
    // DbSet TANIMLARI — Her DbSet bir veritabanı tablosunu temsil eder
    // ============================================================================
    // DbSet<User> Users  →  PostgreSQL'deki "users" tablosu
    // Bu tanımı yaptığında artık şöyle kullanabilirsin:
    //   _context.Users.Add(newUser);         → Yeni kullanıcı ekle
    //   _context.Users.Find(id);             → ID ile kullanıcı bul
    //   _context.Users.Where(u => u.Email == "x");  → Filtreleme yap

    public DbSet<User> Users => Set<User>();                         // Kullanıcılar tablosu
    public DbSet<GithubProfile> GithubProfiles => Set<GithubProfile>(); // GitHub profilleri tablosu
    public DbSet<AnalysisScore> AnalysisScores => Set<AnalysisScore>(); // Analiz skorları tablosu
    public DbSet<CandidateReport> CandidateReports => Set<CandidateReport>(); // Aday raporları tablosu
    public DbSet<CvDocument> CvDocuments => Set<CvDocument>();       // CV dosyaları tablosu
    public DbSet<WorkerHeartbeat> WorkerHeartbeats => Set<WorkerHeartbeat>();

    // ============================================================================
    // OnModelCreating — Tablo yapılarını ve ilişkileri detaylı ayarla
    // ============================================================================
    // Bu metot, EF Core migration oluşturduğunda çağrılır.
    // Burada her tablo için:
    //   - Tablo adını belirleriz (ToTable)
    //   - Primary key'i belirleriz (HasKey)
    //   - Kolon kısıtlamalarını ayarlarız (IsRequired, HasMaxLength)
    //   - Tablolar arası ilişkileri tanımlarız (HasOne, WithMany, HasForeignKey)
    //   - Index'leri oluştururuz (HasIndex)
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ==================== USER (Kullanıcılar) ====================
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");                    // PostgreSQL'deki tablo adı: "users"
            entity.HasKey(e => e.Id);                   // Primary Key: Id sütunu
            entity.Property(e => e.Email)
                  .IsRequired()                         // Email zorunlu alan (NULL olamaz)
                  .HasMaxLength(256);                    // Maksimum 256 karakter
            entity.Property(e => e.PasswordHash)
                  .IsRequired()
                  .HasMaxLength(512);
            entity.HasIndex(e => e.Email).IsUnique();   // Email benzersiz olmalı (aynı email 2 kez olamaz)
            entity.Property(e => e.UserType)
                  .HasConversion<string>()              // Enum'ı veritabanında string olarak sakla
                  .HasMaxLength(20);                    // "Individual" veya "Corporate"
        });

        // ==================== GITHUB PROFILE (GitHub Profilleri) ====================
        modelBuilder.Entity<GithubProfile>(entity =>
        {
            entity.ToTable("github_profiles");          // Tablo adı: "github_profiles"
            entity.HasKey(e => e.Id);                   // Primary Key: Id
            entity.Property(e => e.Username)
                  .IsRequired()                         // Username zorunlu
                  .HasMaxLength(100);                   // Maksimum 100 karakter

            // İLİŞKİ TANIMI:
            // Bir GithubProfile → bir User'a aittir (HasOne)
            // Bir User → birden fazla GithubProfile'a sahip olabilir (WithMany)
            // Bağlantı UserId üzerinden yapılır (HasForeignKey)
            // Kullanıcı silinirse profili de silinir (Cascade)
            entity.HasOne(e => e.User)
                  .WithMany(u => u.GithubProfiles)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== CANDIDATE REPORT (Aday Raporları) ====================
        modelBuilder.Entity<CandidateReport>(entity =>
        {
            entity.ToTable("candidate_reports");        // Tablo adı: "candidate_reports"
            entity.HasKey(e => e.Id);                   // Primary Key: Id
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");         // Oluşturulma tarihi otomatik olarak şu anki zaman

            // İLİŞKİ 1: Rapor → Kullanıcı
            // Bir rapor bir kullanıcıya aittir
            entity.HasOne(e => e.User)
                  .WithMany(u => u.CandidateReports)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // İLİŞKİ 2: Rapor → GitHub Profili
            // Bir rapor bir GitHub profili üzerinden oluşturulmuştur
            entity.HasOne(e => e.GithubProfile)
                  .WithMany(g => g.CandidateReports)
                  .HasForeignKey(e => e.GithubProfileId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== ANALYSIS SCORE (Analiz Skorları) ====================
        modelBuilder.Entity<AnalysisScore>(entity =>
        {
            entity.ToTable("analysis_scores");          // Tablo adı: "analysis_scores"
            entity.HasKey(e => e.Id);                   // Primary Key: Id
            entity.Property(e => e.Name)
                  .IsRequired()                         // Skor adı zorunlu
                  .HasMaxLength(100);                   // Örnek: "CodeQuality", "ProfileCompleteness"

            // İLİŞKİ: Skor → Rapor
            // Bir skor bir rapora aittir
            // Bir raporun birden fazla skoru olabilir
            entity.HasOne(e => e.CandidateReport)
                  .WithMany(r => r.Scores)
                  .HasForeignKey(e => e.CandidateReportId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ==================== CV DOCUMENT (CV Dosyaları) ====================
        modelBuilder.Entity<CvDocument>(entity =>
        {
            entity.ToTable("cv_documents");             // Tablo adı: "cv_documents"
            entity.HasKey(e => e.Id);                   // Primary Key: Id
            entity.Property(e => e.FileName)
                  .IsRequired()                         // Dosya adı zorunlu
                  .HasMaxLength(256);                   // Örnek: "furkan_cv.pdf"
            entity.Property(e => e.FilePath)
                  .IsRequired()                         // Dosya yolu zorunlu
                  .HasMaxLength(512);                   // Örnek: "uploads/cvs/abc123_furkan_cv.pdf"
            entity.Property(e => e.UploadedAt)
                  .HasDefaultValueSql("NOW()");         // Yüklenme tarihi otomatik

            // İLİŞKİ: CV → Kullanıcı
            // Bir CV bir kullanıcıya aittir
            entity.HasOne(e => e.User)
                  .WithMany(u => u.CvDocuments)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkerHeartbeat>(entity =>
        {
            entity.ToTable("worker_heartbeats");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WorkerName)
                  .IsRequired()
                  .HasMaxLength(128);
            entity.Property(e => e.LastStatus)
                  .IsRequired()
                  .HasMaxLength(64);
            entity.Property(e => e.LastSeenAtUtc)
                  .IsRequired();
            entity.HasIndex(e => e.WorkerName).IsUnique();
        });
    }
}
