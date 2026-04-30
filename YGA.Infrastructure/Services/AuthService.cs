using Microsoft.AspNetCore.Identity;
using YGA.Application.DTOs;
using YGA.Application.Interfaces;
using YGA.Domain;

namespace YGA.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IRepository<User> _userRepository;
    private readonly ITokenService _tokenService;
    private readonly PasswordHasher<User> _passwordHasher = new();

    public AuthService(IRepository<User> userRepository, ITokenService tokenService)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existingUsers = await _userRepository.FindAsync(u => u.Email == normalizedEmail, ct);
        if (existingUsers.Any())
        {
            throw new InvalidOperationException("Bu email ile kayıtlı bir kullanıcı zaten var.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            UserType = UserType.Individual
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        await _userRepository.AddAsync(user, ct);
        await _userRepository.SaveChangesAsync(ct);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var users = await _userRepository.FindAsync(u => u.Email == normalizedEmail, ct);
        var user = users.FirstOrDefault();
        if (user is null)
        {
            return null;
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        return BuildAuthResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        return new AuthResponse
        {
            Token = _tokenService.CreateToken(user),
            ExpiresAt = _tokenService.GetTokenExpiryUtc(),
            UserId = user.Id,
            Email = user.Email
        };
    }
}
