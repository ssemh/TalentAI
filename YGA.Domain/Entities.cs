namespace YGA.Domain;

// Sistem içinde hangi tip kullanıcımız olduğunu belirtmek için enum.
// Bireysel kullanıcı mı (Individual) yoksa kurumsal müşteri mi (Corporate) tutuyoruz.
public enum UserType
{
    Individual,
    Corporate
}

// Sistemde giriş yapabilen veya rapor üreten kişiyi temsil eden temel kullanıcı sınıfı.
// Bu sınıf sadece "kullanıcı kim?" bilgisini taşır, iş kuralları üst katmanlarda yazılacak.
public class User
{
    // Veritabanında birincil anahtar olarak kullanılacak benzersiz kimlik.
    public Guid Id { get; set; }

    // Kullanıcının iletişim ve giriş için kullanacağı e-posta adresi.
    public string Email { get; set; } = string.Empty;

    // Giriş için kullanılan şifrenin hash'lenmiş hali.
    public string PasswordHash { get; set; } = string.Empty;

    // Kullanıcının bireysel mi, kurumsal mı olduğunu gösteren alan.
    public UserType UserType { get; set; }

    // Navigation property'ler — EF Core ilişkileri için.
    public ICollection<GithubProfile> GithubProfiles { get; set; } = new List<GithubProfile>();
    public ICollection<CandidateReport> CandidateReports { get; set; } = new List<CandidateReport>();
    public ICollection<CvDocument> CvDocuments { get; set; } = new List<CvDocument>();
}

// Bir kullanıcının GitHub üzerindeki hesabına ait özet bilgileri tutan sınıf.
// GitHub API'den gelen verileri domain tarafında temsil eder.
public class GithubProfile
{
    // Bu GitHub profili kaydı için benzersiz kimlik.
    public Guid Id { get; set; }

    // Bu profilin hangi kullanıcıya ait olduğunu gösteren foreign key.
    public Guid UserId { get; set; }

    // GitHub üzerindeki kullanıcı adı (örnek: "furkan-dev").
    public string Username { get; set; } = string.Empty;

    // İhtiyaç olursa ham GitHub JSON cevabını saklayabileceğimiz alan.
    // Bu sayede daha sonra tekrar LLM'e göndermek veya detaylı analiz yapmak mümkün olur.
    public string? RawProfileJson { get; set; }

    // GitHub API'den çekilen repo listesinin ham JSON verisi.
    // Repo-level metrikler (dil çeşitliliği, star, fork, son aktivite) buradan hesaplanır.
    public string? RawReposJson { get; set; }

    // Navigation property'ler
    public User User { get; set; } = null!;
    public ICollection<CandidateReport> CandidateReports { get; set; } = new List<CandidateReport>();
}

// Aday için hesapladığımız her bir metriği (ör: CleanCodeSkoru, GhostCoderRiski) temsil eder.
public class AnalysisScore
{
    // Skor kaydı için benzersiz kimlik.
    public Guid Id { get; set; }

    // Bu skorun ait olduğu raporun kimliği (CandidateReport ile ilişki).
    public Guid CandidateReportId { get; set; }

    // Skorun adı (örnek: "CleanCodeScore", "GhostCoderRisk").
    public string Name { get; set; } = string.Empty;

    // Skorun sayısal değeri. 0–100 arası veya ihtiyaca göre ayarlanabilir.
    public double Value { get; set; }

    // Navigation property
    public CandidateReport CandidateReport { get; set; } = null!;
}

// Bir aday için oluşturduğumuz genel raporu temsil eder.
// Bu rapor GitHub verisi + LLM analizi gibi bilgilerden oluşacaktır.
public class CandidateReport
{
    // Rapor kaydı için benzersiz kimlik.
    public Guid Id { get; set; }

    // Bu raporu kimin görüntüleyebileceğini/kimin için üretildiğini belirten kullanıcı kimliği.
    public Guid UserId { get; set; }

    // Bu raporda kullanılan GitHub profil kaydının kimliği.
    public Guid GithubProfileId { get; set; }

    // Raporun ne zaman üretildiğini kaydetmek için zaman damgası.
    public DateTime CreatedAt { get; set; }

    // Navigation property'ler
    public User User { get; set; } = null!;
    public GithubProfile GithubProfile { get; set; } = null!;
    public ICollection<AnalysisScore> Scores { get; set; } = new List<AnalysisScore>();
}

// Bir kullanıcının yüklediği CV dosyasını temsil eder.
// Dosya disk üzerinde saklanır, burada sadece dosya yolu tutulur.
public class CvDocument
{
    // CV kaydı için benzersiz kimlik.
    public Guid Id { get; set; }

    // Bu CV'nin hangi kullanıcıya ait olduğunu gösteren foreign key.
    public Guid UserId { get; set; }

    // Kullanıcının yüklediği orijinal dosya adı (örnek: "furkan_cv.pdf").
    public string FileName { get; set; } = string.Empty;

    // Dosyanın sunucudaki fiziksel yolu (örnek: "uploads/abc123.pdf").
    public string FilePath { get; set; } = string.Empty;

    // CV'den parse edilen metin içeriği (opsiyonel, ileride LLM analizi için kullanılabilir).
    public string? ParsedContent { get; set; }

    // Dosyanın ne zaman yüklendiğini kaydetmek için zaman damgası.
    public DateTime UploadedAt { get; set; }

    // Navigation property
    public User User { get; set; } = null!;
}

// Worker servisinin saglik ve heartbeat bilgisini tutar.
public class WorkerHeartbeat
{
    public Guid Id { get; set; }
    public string WorkerName { get; set; } = string.Empty;
    public DateTime LastSeenAtUtc { get; set; }
    public string LastStatus { get; set; } = "Unknown";
}
