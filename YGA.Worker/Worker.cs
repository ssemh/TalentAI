namespace YGA.Worker;
using Microsoft.EntityFrameworkCore;
using YGA.Infrastructure.Data;

public class Worker : BackgroundService
{
    private static readonly Guid HeartbeatId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private readonly ILogger<Worker> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;

    public Worker(ILogger<Worker> logger, IServiceScopeFactory scopeFactory, IConfiguration configuration)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _configuration.GetValue<int?>("Worker:StatsIntervalSeconds") ?? 60;
        var interval = TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var userCount = await dbContext.Users.CountAsync(stoppingToken);
                var reportCount = await dbContext.CandidateReports.CountAsync(stoppingToken);
                var cvCount = await dbContext.CvDocuments.CountAsync(stoppingToken);

                _logger.LogInformation(
                    "Worker metrics at {TimeUtc}: Users={Users}, Reports={Reports}, Cvs={Cvs}",
                    DateTimeOffset.UtcNow,
                    userCount,
                    reportCount,
                    cvCount);

                await UpsertHeartbeatAsync(dbContext, "Healthy", stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker metrics collection failed");
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await UpsertHeartbeatAsync(dbContext, "Degraded", stoppingToken);
                }
                catch (Exception heartbeatEx)
                {
                    _logger.LogError(heartbeatEx, "Worker heartbeat update failed");
                }
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    private static async Task UpsertHeartbeatAsync(AppDbContext dbContext, string status, CancellationToken ct)
    {
        var heartbeat = await dbContext.WorkerHeartbeats
            .FirstOrDefaultAsync(h => h.WorkerName == "YGA.Worker", ct);

        if (heartbeat is null)
        {
            heartbeat = new YGA.Domain.WorkerHeartbeat
            {
                Id = HeartbeatId,
                WorkerName = "YGA.Worker",
                LastSeenAtUtc = DateTime.UtcNow,
                LastStatus = status
            };
            dbContext.WorkerHeartbeats.Add(heartbeat);
        }
        else
        {
            heartbeat.LastSeenAtUtc = DateTime.UtcNow;
            heartbeat.LastStatus = status;
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
