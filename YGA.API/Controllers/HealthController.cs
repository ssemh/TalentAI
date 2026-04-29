using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YGA.Infrastructure.Data;

namespace YGA.API.Controllers;

[ApiController]
[Route("api/v1/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public HealthController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetSystemHealth(CancellationToken ct)
    {
        // SUNUM NOTU: "readiness" endpoint'i. API ayakta olsa bile
        // DB veya worker sağlıksızsa 503 döndürür; deploy/monitoring için kritik.
        var dbOk = await _dbContext.Database.CanConnectAsync(ct);
        var heartbeat = await _dbContext.WorkerHeartbeats
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.WorkerName == "YGA.Worker", ct);

        var workerHealthy = heartbeat is not null &&
                            DateTime.UtcNow - heartbeat.LastSeenAtUtc <= TimeSpan.FromMinutes(3);
        var overallHealthy = dbOk && workerHealthy;

        var response = new
        {
            status = overallHealthy ? "Healthy" : "Unhealthy",
            checks = new
            {
                database = dbOk ? "Healthy" : "Unhealthy",
                worker = workerHealthy ? "Healthy" : "Unhealthy"
            },
            worker = heartbeat is null
                ? null
                : new
                {
                    heartbeat.WorkerName,
                    heartbeat.LastStatus,
                    heartbeat.LastSeenAtUtc
                }
        };

        return overallHealthy ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }

    [HttpGet("live")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetLiveness()
    {
        // SUNUM NOTU: "liveness" endpoint'i sadece process ayakta mı sorusunu cevaplar.
        // Kubernetes gibi ortamlarda pod restart kararında kullanılır.
        return Ok(new
        {
            status = "Alive",
            service = "YGA.API",
            utc = DateTime.UtcNow
        });
    }

    [HttpGet("worker")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetWorkerHealth(CancellationToken ct)
    {
        // SUNUM NOTU: Worker heartbeat son görülme zamanı kontrol edilir.
        // Eşik süreden eskiyse worker "Unhealthy" kabul edilir.
        var heartbeat = await _dbContext.WorkerHeartbeats
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.WorkerName == "YGA.Worker", ct);

        if (heartbeat is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "Unhealthy",
                message = "Worker heartbeat bulunamadi."
            });
        }

        var age = DateTime.UtcNow - heartbeat.LastSeenAtUtc;
        var healthy = age <= TimeSpan.FromMinutes(3);
        var response = new
        {
            status = healthy ? "Healthy" : "Unhealthy",
            worker = heartbeat.WorkerName,
            workerStatus = heartbeat.LastStatus,
            lastSeenAtUtc = heartbeat.LastSeenAtUtc,
            ageSeconds = (int)age.TotalSeconds
        };

        return healthy ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
    }
}
