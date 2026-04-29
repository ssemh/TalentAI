// ============================================================================
// GithubService.cs — GitHub API Entegrasyonu
// ============================================================================
// Bu sınıf, GitHub'ın açık API'sine HTTP isteği atarak
// bir kullanıcının profil bilgilerini çeker.
//
// Nasıl çalışır?
// 1) Frontend'den "torvalds" gibi bir kullanıcı adı gelir
// 2) Bu sınıf https://api.github.com/users/torvalds adresine GET isteği atar
// 3) GitHub, JSON formatında profil bilgisini döner
// 4) Biz bu JSON'ı GithubProfile entity'sine dönüştürüp DB'ye kaydederiz
//
// Bu sınıf Application katmanındaki IGithubService interface'ini implement eder.
// Yani "GitHub profili getirebilen bir servis lazım" sözleşmesinin gerçek kodudur.
// ============================================================================

using System.Text.Json;    // JSON işlemleri için (şu an kullanmıyoruz ama ileride lazım olacak)
using Microsoft.Extensions.Configuration;
using YGA.Application;     // IGithubService interface'i burada tanımlı
using YGA.Domain;          // GithubProfile entity'si burada tanımlı

namespace YGA.Infrastructure.Services;

/// <summary>
/// GitHub API ile iletişim kuran servis.
/// IGithubService interface'ini implement eder.
/// </summary>
public class GithubService : IGithubService
{
    // HttpClient = HTTP istekleri (GET, POST vb.) göndermek için kullanılan sınıf.
    // Tarayıcıda URL'ye girip Enter'a basmak gibi düşün, ama kod ile yapıyoruz.
    private readonly HttpClient _httpClient;

    // Constructor — DI ile HttpClient otomatik olarak verilir.
    // Program.cs'deki AddHttpClient<IGithubService, GithubService>() satırı bunu sağlar.
    public GithubService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        // GitHub API'nin temel adresi — tüm istekler bu adres üzerine eklenir
        // Örnek: BaseAddress + "users/torvalds" = "https://api.github.com/users/torvalds"
        _httpClient.BaseAddress = new Uri("https://api.github.com/");

        // GitHub API zorunlu header'lar:
        // User-Agent = "Ben kimim" bilgisi (GitHub bunu zorunlu tutar)
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "YGA-Backend");

        // Accept = "Bana JSON formatında cevap ver" demek
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");

        var apiToken = configuration["Github:ApiToken"];
        if (!string.IsNullOrWhiteSpace(apiToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiToken);
        }
    }

    /// <summary>
    /// Verilen GitHub kullanıcı adını kullanarak profil bilgilerini çeker.
    /// 
    /// Adım adım:
    /// 1) https://api.github.com/users/{username} adresine GET isteği at
    /// 2) Cevap başarılıysa (200 OK) JSON'ı al
    /// 3) GithubProfile entity'si oluşturup döndür
    /// 4) Cevap başarısızsa (404, 403 vb.) hata fırlat
    /// </summary>
    /// <param name="username">GitHub kullanıcı adı (örnek: "torvalds")</param>
    /// <returns>GitHub profil bilgilerini içeren GithubProfile nesnesi</returns>
    public async Task<GithubProfile> GetProfileAsync(string username, CancellationToken cancellationToken = default)
    {
        // GitHub API'ye GET isteği gönder
        // $"users/{username}" = string interpolation. username = "torvalds" ise → "users/torvalds"
        var response = await _httpClient.GetAsync($"users/{username}", cancellationToken);

        // Cevap başarısız mı? (404 = kullanıcı bulunamadı, 403 = rate limit aşıldı vb.)
        if (!response.IsSuccessStatusCode)
        {
            // Hata fırlat — bu hata Controller'da yakalanıp kullanıcıya gösterilecek
            throw new HttpRequestException(
                $"GitHub API hatası: {response.StatusCode} — '{username}' kullanıcısı bulunamadı veya API limiti aşıldı.");
        }

        // Başarılı cevabın içeriğini string olarak oku (JSON formatında gelir)
        var json = await response.Content.ReadAsStringAsync(cancellationToken);

        // GithubProfile entity'si oluştur ve döndür
        // Id = Benzersiz kimlik oluştur (Guid.NewGuid = rastgele benzersiz ID)
        // Username = İstekte gönderilen kullanıcı adı
        // RawProfileJson = GitHub'dan gelen ham JSON verisi (ileride analiz için kullanılacak)
        return new GithubProfile
        {
            Id = Guid.NewGuid(),
            Username = username,
            RawProfileJson = json
        };
    }

    /// <summary>
    /// Kullanıcının public repo'larını GitHub API'den çeker.
    /// sort=pushed: Son güncellenen repo'lar önce gelsin.
    /// per_page=100: Maksimum 100 repo çek (GitHub limiti).
    /// </summary>
    public async Task<string> GetUserReposAsync(string username, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync(
            $"users/{username}/repos?sort=pushed&per_page=100&type=owner",
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"GitHub API hatası: {response.StatusCode} — '{username}' repo'ları alınamadı.");
        }

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}
