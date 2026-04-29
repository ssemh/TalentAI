using Microsoft.EntityFrameworkCore;
using YGA.Application.DTOs;
using YGA.Application.Interfaces;
using YGA.Domain;
using YGA.Infrastructure.Data;
using YGA.Infrastructure.Repositories;
using YGA.Infrastructure.Services;

namespace YGA.Tests;

public class AuthServiceTests
{
    [Fact]
    public async Task RegisterAndLogin_ShouldSucceed()
    {
        await using var context = BuildContext();
        var service = new AuthService(new Repository<User>(context), new FakeTokenService());

        var register = await service.RegisterAsync(new RegisterRequest
        {
            Email = "User@Test.Dev",
            Password = "StrongPass123!"
        });

        var login = await service.LoginAsync(new LoginRequest
        {
            Email = "user@test.dev",
            Password = "StrongPass123!"
        });

        Assert.False(string.IsNullOrWhiteSpace(register.Token));
        Assert.NotNull(login);
        Assert.Equal(register.UserId, login!.UserId);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ShouldReturnNull()
    {
        await using var context = BuildContext();
        var service = new AuthService(new Repository<User>(context), new FakeTokenService());
        await service.RegisterAsync(new RegisterRequest
        {
            Email = "user2@test.dev",
            Password = "StrongPass123!"
        });

        var login = await service.LoginAsync(new LoginRequest
        {
            Email = "user2@test.dev",
            Password = "wrong-pass"
        });

        Assert.Null(login);
    }

    private static AppDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new AppDbContext(options);
    }

    private class FakeTokenService : ITokenService
    {
        public string CreateToken(User user) => $"token-{user.Id}";
        public DateTime GetTokenExpiryUtc() => DateTime.UtcNow.AddHours(1);
    }
}
