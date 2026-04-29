using Microsoft.EntityFrameworkCore;
using YGA.Application;
using YGA.Domain;
using YGA.Infrastructure.Data;
using YGA.Infrastructure.Repositories;
using YGA.Infrastructure.Services;

namespace YGA.Tests;

public class CandidateReportServiceTests
{
    [Fact]
    public async Task AnalyzeGithubAsync_CreatesFiveDynamicScores()
    {
        await using var dbContext = BuildContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "candidate@test.dev",
            PasswordHash = "hash",
            UserType = UserType.Individual
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = BuildService(dbContext,
            profileJson: FakeGithubService.CreateProfileJson(
                followers: 50, repos: 10, gists: 5, following: 20,
                name: "Test User", bio: "bio", blog: "https://test.dev",
                location: "Istanbul", company: "YGA"),
            reposJson: FakeGithubService.CreateReposJson(
                repoCount: 5, languages: ["C#", "TypeScript", "Python"],
                starsPerRepo: 3, forksPerRepo: 1,
                hasDescription: true, hasLicense: true, recentlyPushed: true));

        var report = await service.AnalyzeGithubAsync(user.Id, "test-user");

        // v2: 5 skor olmalı (ProfileCompleteness, RepositoryActivity, CodeQuality, LanguageDiversity, CommunityEngagement)
        Assert.Equal(5, report.Scores.Count);
        Assert.All(report.Scores, score =>
        {
            Assert.InRange(score.Value, 0, 100);
            Assert.False(string.IsNullOrWhiteSpace(score.Name));
        });

        // Bilinen skor isimlerini kontrol et
        var scoreNames = report.Scores.Select(s => s.Name).ToHashSet();
        Assert.Contains("ProfileCompleteness", scoreNames);
        Assert.Contains("RepositoryActivity", scoreNames);
        Assert.Contains("CodeQuality", scoreNames);
        Assert.Contains("LanguageDiversity", scoreNames);
        Assert.Contains("CommunityEngagement", scoreNames);
    }

    [Fact]
    public async Task AnalyzeGithubAsync_WithNoRepos_StillCreatesScores()
    {
        await using var dbContext = BuildContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "empty@test.dev",
            PasswordHash = "hash",
            UserType = UserType.Individual
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = BuildService(dbContext,
            profileJson: FakeGithubService.CreateProfileJson(
                followers: 0, repos: 0, gists: 0, following: 0),
            reposJson: "[]");  // Boş repo listesi

        var report = await service.AnalyzeGithubAsync(user.Id, "empty-user");

        Assert.Equal(5, report.Scores.Count);
        // Boş profil + boş repo = düşük skorlar
        Assert.All(report.Scores, score => Assert.InRange(score.Value, 0, 100));
    }

    [Fact]
    public async Task GetReportByIdAsync_ReturnsReportWithScoresAndProfile()
    {
        await using var dbContext = BuildContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "details@test.dev",
            PasswordHash = "hash",
            UserType = UserType.Individual
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var service = BuildService(dbContext,
            profileJson: FakeGithubService.CreateProfileJson(
                followers: 3, repos: 2, gists: 1, following: 4),
            reposJson: FakeGithubService.CreateReposJson(
                repoCount: 2, languages: ["JavaScript"],
                starsPerRepo: 0, forksPerRepo: 0,
                hasDescription: false, hasLicense: false, recentlyPushed: false));

        var created = await service.AnalyzeGithubAsync(user.Id, "detail-user");
        var fetched = await service.GetReportByIdAsync(created.Id);

        Assert.NotNull(fetched);
        Assert.NotNull(fetched!.GithubProfile);
        Assert.Equal(5, fetched.Scores.Count);
    }

    [Fact]
    public void BuildScores_HighQualityProfile_ProducesHighScores()
    {
        var profileJson = FakeGithubService.CreateProfileJson(
            followers: 200, repos: 30, gists: 10, following: 50,
            name: "Linus Torvalds", bio: "Creator of Linux",
            blog: "https://linux.org", location: "Portland", company: "Linux Foundation");
        var reposJson = FakeGithubService.CreateReposJson(
            repoCount: 10, languages: ["C", "C++", "Python", "Shell", "Makefile", "Perl", "Assembly", "Rust"],
            starsPerRepo: 100, forksPerRepo: 50,
            hasDescription: true, hasLicense: true, recentlyPushed: true);

        var scores = CandidateReportService.BuildScores(profileJson, reposJson, Guid.NewGuid());

        Assert.Equal(5, scores.Count);
        var profileCompleteness = scores.First(s => s.Name == "ProfileCompleteness");
        var languageDiversity = scores.First(s => s.Name == "LanguageDiversity");
        var communityEngagement = scores.First(s => s.Name == "CommunityEngagement");

        Assert.Equal(100, profileCompleteness.Value);  // Tüm alanlar dolu
        Assert.Equal(100, languageDiversity.Value);     // 8+ dil
        Assert.True(communityEngagement.Value >= 80);   // Yüksek star+fork
    }

    private static CandidateReportService BuildService(AppDbContext dbContext, string profileJson, string reposJson)
    {
        var userRepo = new Repository<User>(dbContext);
        var profileRepo = new Repository<GithubProfile>(dbContext);
        var reportRepo = new Repository<CandidateReport>(dbContext);
        var scoreRepo = new Repository<AnalysisScore>(dbContext);
        return new CandidateReportService(
            new FakeGithubService(profileJson, reposJson),
            userRepo,
            profileRepo,
            reportRepo,
            scoreRepo,
            dbContext);
    }

    private static AppDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new AppDbContext(options);
    }

    private class FakeGithubService : IGithubService
    {
        private readonly string _rawProfileJson;
        private readonly string _rawReposJson;

        public FakeGithubService(string rawProfileJson, string rawReposJson)
        {
            _rawProfileJson = rawProfileJson;
            _rawReposJson = rawReposJson;
        }

        public Task<GithubProfile> GetProfileAsync(string username, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new GithubProfile
            {
                Id = Guid.NewGuid(),
                Username = username,
                RawProfileJson = _rawProfileJson
            });
        }

        public Task<string> GetUserReposAsync(string username, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_rawReposJson);
        }

        public static string CreateProfileJson(
            int followers, int repos, int gists, int following,
            string? name = null, string? bio = null, string? blog = null,
            string? location = null, string? company = null)
        {
            return $$"""
                   {
                     "followers": {{followers}},
                     "public_repos": {{repos}},
                     "public_gists": {{gists}},
                     "following": {{following}},
                     "name": "{{name ?? string.Empty}}",
                     "bio": "{{bio ?? string.Empty}}",
                     "blog": "{{blog ?? string.Empty}}",
                     "location": "{{location ?? string.Empty}}",
                     "company": "{{company ?? string.Empty}}"
                   }
                   """;
        }

        public static string CreateReposJson(
            int repoCount, string[] languages,
            int starsPerRepo, int forksPerRepo,
            bool hasDescription, bool hasLicense, bool recentlyPushed)
        {
            var repos = new List<string>();
            var pushedDate = recentlyPushed
                ? DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
                : DateTime.UtcNow.AddYears(-2).ToString("yyyy-MM-ddTHH:mm:ssZ");

            for (var i = 0; i < repoCount; i++)
            {
                var lang = languages[i % languages.Length];
                var description = hasDescription ? $"\"Project {i} description\"" : "\"\"";
                var license = hasLicense ? """{"key":"mit","name":"MIT License"}""" : "null";

                repos.Add($$"""
                    {
                      "name": "repo-{{i}}",
                      "language": "{{lang}}",
                      "stargazers_count": {{starsPerRepo}},
                      "forks_count": {{forksPerRepo}},
                      "fork": false,
                      "description": {{description}},
                      "license": {{license}},
                      "homepage": "",
                      "pushed_at": "{{pushedDate}}",
                      "size": 1024
                    }
                    """);
            }

            return $"[{string.Join(",", repos)}]";
        }
    }
}
