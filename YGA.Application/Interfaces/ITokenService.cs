using YGA.Domain;

namespace YGA.Application.Interfaces;

public interface ITokenService
{
    string CreateToken(User user);
    DateTime GetTokenExpiryUtc();
}
