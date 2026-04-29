using Microsoft.AspNetCore.Mvc;
using YGA.Application.DTOs;
using YGA.Application.Interfaces;

namespace YGA.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        // SUNUM NOTU: Kayıt endpoint'i başarılı olunca direkt JWT token döner.
        // Böylece frontend register sonrası ekstra login çağrısı yapmadan devam edebilir.
        var response = await _authService.RegisterAsync(request, ct);
        return Ok(response);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        // SUNUM NOTU: Login'de sadece credential doğrulanır, token üretimi service katmanında.
        // Controller burada ince (thin) kalır; iş kuralı servislerde toplanır.
        var response = await _authService.LoginAsync(request, ct);
        if (response is null)
        {
            return Unauthorized(new { message = "Email veya şifre hatalı." });
        }

        return Ok(response);
    }
}
