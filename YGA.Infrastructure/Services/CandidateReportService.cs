// ============================================================================
// CandidateReportService.cs — GitHub Analiz + Rapor Oluşturma Servisi
// ============================================================================
// Bu sınıf, projenin ANA İŞ MANTIĞINI barındırır.
// 
// Ne yapar?
// 1) GitHub'dan kullanıcı profilini VE repo'larını çeker
// 2) Profil + repo bilgisini veritabanına kaydeder
// 3) Bir "Aday Raporu" oluşturur
// 4) Profil-level VE repo-level analiz skorlarını hesaplar
// 5) Sonucu döndürür → Controller bunu frontend'e iletir
//
// Skorlama Sistemi (v2 — Repo-Level Metrikler):
//   1) ProfileCompleteness  — Profil alanlarının doluluğu (name, bio, blog, location, company)
//   2) RepositoryActivity   — Repo push tarihleri + aktivite yoğunluğu
//   3) CodeQuality          — README, lisans, açıklama varlığı + repo çeşitliliği
//   4) LanguageDiversity    — Kaç farklı programlama dili kullanılmış
//   5) CommunityEngagement  — Toplam star + fork + watcher sayıları
// ============================================================================

using YGA.Application;                // IGithubService
using YGA.Application.Interfaces;     // IRepository, ICandidateReportService
using YGA.Domain;                     // User, GithubProfile, CandidateReport, AnalysisScore
using Microsoft.EntityFrameworkCore;
using YGA.Infrastructure.Data;
using System.Text.Json;

namespace YGA.Infrastructure.Services;

/// <summary>
/// Aday analiz raporu oluşturan ve sorgulayan servis.
/// Tüm iş akışı burada koordine edilir.
/// </summary>
public class CandidateReportService : ICandidateReportService
{
    private readonly IGithubService _githubService;
    private readonly IRepository<User> _userRepo;
    private readonly IRepository<GithubProfile> _profileRepo;
    private readonly IRepository<CandidateReport> _reportRepo;
    private readonly IRepository<AnalysisScore> _scoreRepo;
    private readonly AppDbContext _dbContext;

    public CandidateReportService(
        IGithubService githubService,
        IRepository<User> userRepo,
        IRepository<GithubProfile> profileRepo,
        IRepository<CandidateReport> reportRepo,
        IRepository<AnalysisScore> scoreRepo,
        AppDbContext dbContext)
    {
        _githubService = githubService;
        _userRepo = userRepo;
        _profileRepo = profileRepo;
        _reportRepo = reportRepo;
        _scoreRepo = scoreRepo;
        _dbContext = dbContext;
    }

    /// <summary>
    /// GitHub kullanıcı adını analiz eder ve rapor oluşturur.
    /// Profil + repo verilerini çeker, 5 farklı metrikle skorlar.
    /// </summary>
    public async Task<CandidateReport> AnalyzeGithubAsync(Guid userId, string githubUsername, CancellationToken ct = default)
    {
        // SUNUM NOTU: Bu method projenin "çekirdek akışı".
        // 1) Veri çek 2) normalize et 3) raporla 4) skorla 5) persist et.
        // ADIM 0: Kullanıcı kontrolü
        var existingUser = await _userRepo.GetByIdAsync(userId, ct);
        if (existingUser == null)
        {
            throw new InvalidOperationException("Kullanıcı bulunamadı.");
        }

        // ADIM 1: GitHub profilini çek
        var profile = await _githubService.GetProfileAsync(githubUsername, ct);
        profile.UserId = userId;

        // ADIM 1.5: GitHub repo'larını çek (YENİ!)
        // Repo-level metrikler için kullanıcının public repo'larını çekiyoruz.
        string? rawReposJson = null;
        try
        {
            rawReposJson = await _githubService.GetUserReposAsync(githubUsername, ct);
            profile.RawReposJson = rawReposJson;
        }
        catch (HttpRequestException)
        {
            // Repo'lar alınamazsa analiz yine de devam eder, sadece profil-level skorlar hesaplanır.
        }

        // ADIM 2: Profili veritabanına kaydet
        await _profileRepo.AddAsync(profile, ct);
        await _profileRepo.SaveChangesAsync(ct);

        // ADIM 3: Rapor oluştur
        var report = new CandidateReport
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            GithubProfileId = profile.Id,
            CreatedAt = DateTime.UtcNow
        };
        await _reportRepo.AddAsync(report, ct);
        await _reportRepo.SaveChangesAsync(ct);

        // ADIM 4: Analiz skorlarını hesapla (profil + repo verileriyle)
        var scores = BuildScores(profile.RawProfileJson, rawReposJson, report.Id);

        // Skorları toplu kaydet (performans: AddRangeAsync ile tek seferde)
        await _dbContext.AnalysisScores.AddRangeAsync(scores, ct);
        await _dbContext.SaveChangesAsync(ct);

        report.Scores = scores;
        return report;
    }

    // ========================================================================
    // SKOR HESAPLAMA — Profil + Repo Verileri
    // ========================================================================

    /// <summary>
    /// Profil ve repo JSON verilerinden 5 farklı skor hesaplar.
    /// </summary>
    internal static List<AnalysisScore> BuildScores(string? rawProfileJson, string? rawReposJson, Guid reportId)
    {
        // SUNUM NOTU: Skorlar sabit/hardcoded değil;
        // GitHub profil ve repo sinyallerinden dinamik üretiliyor.
        var scores = new List<AnalysisScore>();

        // 1) ProfileCompleteness — Profil alanlarının doluluğu
        scores.Add(new AnalysisScore
        {
            Id = Guid.NewGuid(),
            CandidateReportId = reportId,
            Name = "ProfileCompleteness",
            Value = CalculateProfileCompleteness(rawProfileJson)
        });

        // 2) RepositoryActivity — Repo aktivite yoğunluğu
        scores.Add(new AnalysisScore
        {
            Id = Guid.NewGuid(),
            CandidateReportId = reportId,
            Name = "RepositoryActivity",
            Value = CalculateRepositoryActivity(rawProfileJson, rawReposJson)
        });

        // 3) CodeQuality — Repo'ların kalite sinyalleri
        scores.Add(new AnalysisScore
        {
            Id = Guid.NewGuid(),
            CandidateReportId = reportId,
            Name = "CodeQuality",
            Value = CalculateCodeQuality(rawReposJson)
        });

        // 4) LanguageDiversity — Kaç farklı dil kullanılmış
        scores.Add(new AnalysisScore
        {
            Id = Guid.NewGuid(),
            CandidateReportId = reportId,
            Name = "LanguageDiversity",
            Value = CalculateLanguageDiversity(rawReposJson)
        });

        // 5) CommunityEngagement — Star + fork + watcher toplam etkileşimi
        scores.Add(new AnalysisScore
        {
            Id = Guid.NewGuid(),
            CandidateReportId = reportId,
            Name = "CommunityEngagement",
            Value = CalculateCommunityEngagement(rawReposJson)
        });

        return scores;
    }

    // ========================================================================
    // 1) ProfileCompleteness (0-100)
    // ========================================================================
    // name, bio, blog, location, company alanlarının dolu olup olmadığına bakar.
    // Her alan belirli bir ağırlığa sahip.
    private static int CalculateProfileCompleteness(string? rawProfileJson)
    {
        if (string.IsNullOrWhiteSpace(rawProfileJson)) return 20;

        using var doc = JsonDocument.Parse(rawProfileJson);
        var root = doc.RootElement;

        return (HasNonEmpty(root, "name") ? 20 : 0) +
               (HasNonEmpty(root, "bio") ? 30 : 0) +
               (HasNonEmpty(root, "blog") ? 15 : 0) +
               (HasNonEmpty(root, "location") ? 15 : 0) +
               (HasNonEmpty(root, "company") ? 20 : 0);
    }

    // ========================================================================
    // 2) RepositoryActivity (0-100)
    // ========================================================================
    // Profil-level: public_repos + followers + gists
    // Repo-level: Son 6 ayda kaç repo'ya push yapılmış?
    private static int CalculateRepositoryActivity(string? rawProfileJson, string? rawReposJson)
    {
        // SUNUM NOTU: Activity iki kaynağın birleşimi:
        // - profil-level metrikler
        // - repo-level "son 6 ay push" sinyali
        var profileScore = 0;

        // Profil verisinden temel aktivite
        if (!string.IsNullOrWhiteSpace(rawProfileJson))
        {
            using var profileDoc = JsonDocument.Parse(rawProfileJson);
            var root = profileDoc.RootElement;

            var publicRepos = GetInt(root, "public_repos");
            var followers = GetInt(root, "followers");
            var gists = GetInt(root, "public_gists");

            // Profil-level skor (maks 40 puan)
            profileScore = Math.Min(40, publicRepos * 2 + followers / 2 + gists);
        }

        // Repo verisinden gerçek aktivite (maks 60 puan)
        var repoActivityScore = 0;
        if (!string.IsNullOrWhiteSpace(rawReposJson))
        {
            using var reposDoc = JsonDocument.Parse(rawReposJson);
            var repos = reposDoc.RootElement;

            if (repos.ValueKind == JsonValueKind.Array)
            {
                var totalRepos = repos.GetArrayLength();
                var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
                var recentlyPushed = 0;

                foreach (var repo in repos.EnumerateArray())
                {
                    if (repo.TryGetProperty("pushed_at", out var pushedAt) &&
                        pushedAt.ValueKind == JsonValueKind.String &&
                        DateTime.TryParse(pushedAt.GetString(), out var pushDate) &&
                        pushDate > sixMonthsAgo)
                    {
                        recentlyPushed++;
                    }
                }

                // Son 6 ayda push yapılan repo oranı + bonus
                if (totalRepos > 0)
                {
                    var activeRatio = (double)recentlyPushed / totalRepos;
                    repoActivityScore = (int)(activeRatio * 40) + Math.Min(20, recentlyPushed * 3);
                }
            }
        }

        return Math.Min(100, profileScore + repoActivityScore);
    }

    // ========================================================================
    // 3) CodeQuality (0-100)
    // ========================================================================
    // Repo'ların kalite sinyalleri:
    // - Kaç repo'da README/açıklama var?
    // - Kaç repo'da lisans belirtilmiş?
    // - Fork olmayan (orijinal) repo oranı
    // - Ortalama repo boyutu
    private static int CalculateCodeQuality(string? rawReposJson)
    {
        // SUNUM NOTU: Bu skor statik kod analizinden ziyade
        // repo metadata kalitesi (description/license/homepage/originality) ölçer.
        if (string.IsNullOrWhiteSpace(rawReposJson)) return 25;

        using var doc = JsonDocument.Parse(rawReposJson);
        var repos = doc.RootElement;
        if (repos.ValueKind != JsonValueKind.Array || repos.GetArrayLength() == 0) return 25;

        var totalRepos = repos.GetArrayLength();
        var withDescription = 0;
        var withLicense = 0;
        var originalRepos = 0;     // fork olmayan
        var withHomepage = 0;

        foreach (var repo in repos.EnumerateArray())
        {
            if (HasNonEmpty(repo, "description")) withDescription++;

            if (repo.TryGetProperty("license", out var license) &&
                license.ValueKind != JsonValueKind.Null) withLicense++;

            if (repo.TryGetProperty("fork", out var fork) &&
                fork.ValueKind == JsonValueKind.False) originalRepos++;

            if (HasNonEmpty(repo, "homepage")) withHomepage++;
        }

        // Açıklama oranı (30 puan)
        var descriptionScore = (int)((double)withDescription / totalRepos * 30);

        // Lisans oranı (25 puan)
        var licenseScore = (int)((double)withLicense / totalRepos * 25);

        // Orijinal repo oranı (30 puan) — fork yapıp bırakmak yerine kendi repo'su var mı?
        var originalScore = (int)((double)originalRepos / totalRepos * 30);

        // Homepage/demo linki oranı (15 puan)
        var homepageScore = (int)((double)withHomepage / totalRepos * 15);

        return Math.Min(100, descriptionScore + licenseScore + originalScore + homepageScore);
    }

    // ========================================================================
    // 4) LanguageDiversity (0-100)
    // ========================================================================
    // Kaç farklı programlama dili kullanılmış?
    // 1 dil = 15, 2 dil = 30, 3 dil = 50, 5+ dil = 80, 8+ dil = 100
    private static int CalculateLanguageDiversity(string? rawReposJson)
    {
        if (string.IsNullOrWhiteSpace(rawReposJson)) return 10;

        using var doc = JsonDocument.Parse(rawReposJson);
        var repos = doc.RootElement;
        if (repos.ValueKind != JsonValueKind.Array) return 10;

        var languages = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var repo in repos.EnumerateArray())
        {
            if (repo.TryGetProperty("language", out var lang) &&
                lang.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(lang.GetString()))
            {
                languages.Add(lang.GetString()!);
            }
        }

        return languages.Count switch
        {
            0 => 5,
            1 => 15,
            2 => 30,
            3 => 50,
            4 => 65,
            5 => 75,
            6 => 80,
            7 => 90,
            _ => 100     // 8+ dil
        };
    }

    // ========================================================================
    // 5) CommunityEngagement (0-100)
    // ========================================================================
    // Toplam star + fork + watcher sayıları.
    // Kullanıcının projeleri toplulukta ne kadar ilgi görmüş?
    private static int CalculateCommunityEngagement(string? rawReposJson)
    {
        if (string.IsNullOrWhiteSpace(rawReposJson)) return 5;

        using var doc = JsonDocument.Parse(rawReposJson);
        var repos = doc.RootElement;
        if (repos.ValueKind != JsonValueKind.Array) return 5;

        var totalStars = 0;
        var totalForks = 0;

        foreach (var repo in repos.EnumerateArray())
        {
            totalStars += GetInt(repo, "stargazers_count");
            totalForks += GetInt(repo, "forks_count");
        }

        // Toplam etkileşim puanı
        // Star'lar daha değerli (x2), fork'lar da iyi bir sinyal (x3)
        var engagementPoints = totalStars * 2 + totalForks * 3;

        return engagementPoints switch
        {
            0 => 5,
            <= 5 => 15,
            <= 15 => 30,
            <= 30 => 45,
            <= 50 => 55,
            <= 100 => 70,
            <= 250 => 80,
            <= 500 => 90,
            _ => 100
        };
    }

    // ========================================================================
    // YARDIMCI METOTLAR
    // ========================================================================

    private static int GetInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var element)) return 0;
        return element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var value)
            ? Math.Max(0, value)
            : 0;
    }

    private static bool HasNonEmpty(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var element)) return false;
        if (element.ValueKind != JsonValueKind.String) return false;
        return !string.IsNullOrWhiteSpace(element.GetString());
    }

    // ========================================================================
    // RAPOR SORGULAMA
    // ========================================================================

    public async Task<IEnumerable<CandidateReport>> GetReportsByUserAsync(Guid userId, CancellationToken ct = default)
    {
        return await _dbContext.CandidateReports
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .Include(r => r.GithubProfile)
            .Include(r => r.Scores)
            .ToListAsync(ct);
    }

    public async Task<(IEnumerable<CandidateReport> Items, int TotalCount)> GetReportsByUserPagedAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _dbContext.CandidateReports
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Include(r => r.GithubProfile)
            .Include(r => r.Scores)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<CandidateReport?> GetReportByIdAsync(Guid reportId, CancellationToken ct = default)
    {
        return await _dbContext.CandidateReports
            .AsNoTracking()
            .Include(r => r.GithubProfile)
            .Include(r => r.Scores)
            .FirstOrDefaultAsync(r => r.Id == reportId, ct);
    }
}
