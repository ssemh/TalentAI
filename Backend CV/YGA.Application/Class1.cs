using YGA.Domain;

namespace YGA.Application;

// Application katmanında tanımladığımız bu arayüz,
// GitHub ile konuşan servisin "sözleşmesini" belirler.
// Üst katmanlar sadece bu interface'i bilir, gerçek implementasyon Infrastructure katmanında yazılacaktır.
public interface IGithubService
{
    // Verilen GitHub kullanıcı adını kullanarak profil bilgilerini getiren metot.
    // Dönüş tipi domain katmanındaki GithubProfile'dır; böylece üst katmanlar ham API detayını görmez.
    Task<GithubProfile> GetProfileAsync(string username, CancellationToken cancellationToken = default);
}
