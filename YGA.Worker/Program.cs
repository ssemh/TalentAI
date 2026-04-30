using YGA.Worker;
using Microsoft.EntityFrameworkCore;
using YGA.Infrastructure.Data;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Connection string is missing. Set ConnectionStrings__DefaultConnection.");
    }

    options.UseNpgsql(connectionString);
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
