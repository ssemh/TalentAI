// ============================================================================
// ApiControllerBase.cs — Tüm Controller'ların Ortak Base Sınıfı
// ============================================================================
// Bu sınıf, tüm API controller'larında tekrar eden ortak metotları barındırır.
// Yeni controller yazdığında ControllerBase yerine bunu extend et:
//   public class MyController : ApiControllerBase
// ============================================================================

using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace YGA.API.Controllers;

/// <summary>
/// Tüm API controller'ları için ortak temel sınıf.
/// JWT claim'lerden kullanıcı kimliği çıkarma gibi paylaşılan işlevleri sağlar.
/// </summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>
    /// JWT token içindeki claim'lerden mevcut kullanıcının ID'sini çıkarır.
    /// Önce ClaimTypes.NameIdentifier, bulamazsa JwtRegisteredClaimNames.Sub claim'ine bakar.
    /// </summary>
    /// <returns>Kullanıcı ID'si veya parse edilemezse null</returns>
    protected Guid? GetUserId()
    {
        var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(claimValue, out var userId) ? userId : null;
    }
}
