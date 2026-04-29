using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using YGA.Application.Interfaces;
using YGA.Domain;

namespace YGA.Infrastructure.Services;

public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string CreateToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "YGA.API";
        var audience = _configuration["Jwt:Audience"] ?? "YGA.Client";
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key is not configured.");
        var expiresMinutes = int.TryParse(_configuration["Jwt:ExpiresMinutes"], out var parsedMinutes)
            ? parsedMinutes
            : 120;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.UserType.ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public DateTime GetTokenExpiryUtc()
    {
        var expiresMinutes = int.TryParse(_configuration["Jwt:ExpiresMinutes"], out var parsedMinutes)
            ? parsedMinutes
            : 120;
        return DateTime.UtcNow.AddMinutes(expiresMinutes);
    }
}
