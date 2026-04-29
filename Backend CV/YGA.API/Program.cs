// ============================================================================
// Program.cs — Uygulamanın başlangıç noktası (Entry Point)
// ============================================================================
// Bu dosya uygulamanın "ana kapısı"dır. Burada:
// 1) Hangi servislerin kullanılacağı belirlenir (DI — Dependency Injection)
// 2) Veritabanı bağlantısı ayarlanır
// 3) CORS (farklı portlardan gelen isteklere izin) ayarlanır
// 4) Swagger (API test arayüzü) ayarlanır
// 5) Middleware pipeline (isteklerin sırayla geçtiği katmanlar) oluşturulur
// ============================================================================

// Kullanacağımız kütüphaneleri içe aktarıyoruz (using = "bunu kullanacağım" demek)
using Microsoft.EntityFrameworkCore;       // Veritabanı işlemleri için (EF Core)
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using YGA.Application;                     // IGithubService interface'i burada
using YGA.Application.Interfaces;          // IRepository, ICandidateReportService, ICvService
using YGA.Domain;                          // User, GithubProfile vb. entity'ler
using YGA.Infrastructure.Data;             // AppDbContext (veritabanı bağlamı)
using YGA.Infrastructure.Repositories;     // Repository<T> (veritabanı CRUD işlemleri)
using YGA.Infrastructure.Services;         // GithubService, CandidateReportService, CvService
using YGA.API.Middleware;
using System.Threading.RateLimiting;       // Rate limiting politikaları
using Microsoft.AspNetCore.RateLimiting;   // AddFixedWindowLimiter extension metotları

// ============================================================================
// 1) BUILDER OLUŞTUR — Uygulamayı yapılandırmaya başlıyoruz
// ============================================================================
// WebApplication.CreateBuilder = "Bir web uygulaması inşa etmeye başla" demek.
// builder üzerinden servisler ve ayarlar eklenir.
var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});

// ============================================================================
// 2) CONTROLLER DESTEĞ İ EKLE
// ============================================================================
// AddControllers = "Bu projede Controller sınıfları kullanacağız" demek.
// Controller = Frontend'den gelen HTTP isteklerini karşılayan sınıflar.
// Örnek: GithubController, CvController
builder.Services.AddControllers();

// ============================================================================
// 3) SWAGGER / OPENAPI AYARLARI
// ============================================================================
// Swagger = API'yi tarayıcıdan test edebileceğin görsel arayüz.
// http://localhost:5105/swagger adresinden erişilir.
// Tüm endpoint'leri görüp, istek gönderip, yanıtları görebilirsin.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Swagger sayfasında görünecek API bilgileri
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "YGA - CV Analiz API",
        Version = "v1",
        Description = "GitHub profil analizi ve CV yükleme backend servisi."
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Bearer {token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ============================================================================
// 4) POSTGRESQL VERİTABANI BAĞLANTISI
// ============================================================================
// AddDbContext = "Bu veritabanı bağlamını (AppDbContext) sisteme tanıt" demek.
// UseNpgsql = "PostgreSQL veritabanı kullan" demek.
// GetConnectionString("DefaultConnection") = appsettings.json'daki bağlantı adresini oku.
// Bağlantı adresi: "Host=localhost;Port=5432;Database=yga_db;Username=postgres;Password=postgres"
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Connection string is missing. Set ConnectionStrings__DefaultConnection.");
    }

    options.UseNpgsql(connectionString);
});

// ============================================================================
// 5) DEPENDENCY INJECTION (DI) — Bağımlılık Enjeksiyonu
// ============================================================================
// DI = "Bir sınıf başka bir sınıfa ihtiyaç duyduğunda, onu otomatik olarak ver" demek.
//
// Örnek: GithubController içinde ICandidateReportService lazım.
// DI sayesinde biz "new CandidateReportService()" yazmıyoruz,
// .NET otomatik olarak oluşturup Controller'a veriyor.
//
// AddScoped = Her HTTP isteği için yeni bir instance oluştur, istek bitince at.

// Repository'ler (Generic) — Her entity için ayrı ayrı yazmak yerine
// tek bir Repository<T> sınıfı kullanıyoruz. T yerine User, GithubProfile vb. gelir.
// typeof() kullanıyoruz çünkü generic tipler çalışma zamanında belirleniyor.
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Servisler — İş mantığını yapan sınıflar
// AddHttpClient = GithubService'e otomatik olarak bir HttpClient ver (HTTP istekleri için).
builder.Services.AddHttpClient<IGithubService, GithubService>();

// "ICandidateReportService istenirse CandidateReportService oluştur ve ver"
builder.Services.AddScoped<ICandidateReportService, CandidateReportService>();

// "ICvService istenirse CvService oluştur ve ver"
builder.Services.AddScoped<ICvService, CvService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "YGA.API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "YGA.Client";
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT key is missing. Set Jwt__Key in environment variables.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ============================================================================
// RATE LIMITING — İstek Hız Sınırlama
// ============================================================================
// Bir kullanıcının belirli sürede kaç istek atabileceğini sınırlar.
// Bu, API'yi kötüye kullanıma ve DDoS saldırılarına karşı korur.
//
// İki politika tanımlıyoruz:
// 1) "fixed" — Genel endpoint'ler: Dakikada 30 istek
// 2) "github" — GitHub analizi: Dakikada 5 istek (API çağrısı pahalı)
builder.Services.AddRateLimiter(options =>
{
    // Limit aşıldığında dönen HTTP yanıtı
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Genel politika: Dakikada 30 istek
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.PermitLimit = 30;                          // Maks 30 istek
        opt.Window = TimeSpan.FromMinutes(1);           // 1 dakikalık pencere
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 5;                             // Kuyrukta maks 5 istek bekleyebilir
    });

    // GitHub analiz politikası: Dakikada 5 istek (API call pahalı)
    options.AddFixedWindowLimiter("github", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });

    // Her kullanıcı kendi limitine sahip (IP veya UserId bazlı)
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Çok fazla istek gönderildi. Lütfen biraz bekleyin.", statusCode = 429 },
            token);
    };
});

// ============================================================================
// 6) CORS (Cross-Origin Resource Sharing) AYARLARI
// ============================================================================
// CORS = Farklı adreslerden (origin) gelen isteklere izin verme kuralları.
//
// Neden gerekli? Tarayıcı güvenlik kuralı:
// Frontend localhost:3000'de çalışıyor, Backend localhost:5105'te çalışıyor.
// Tarayıcı farklı portları "farklı adres" sayar ve varsayılan olarak engeller.
// CORS ayarı ile "Bu adreslerden gelen isteklere izin ver" diyoruz.
builder.Services.AddCors(options =>
{
    // "AllowFrontend" adında bir CORS politikası oluştur
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",   // React default portu
                "http://localhost:5173",   // Vite default portu
                "http://localhost:3001"    // Alternatif port (yedek)
            )
            .AllowAnyHeader()              // Her türlü HTTP header'a izin ver
            .AllowAnyMethod()              // GET, POST, PUT, DELETE hepsine izin ver
            .AllowCredentials();           // Cookie/token göndermeye izin ver
    });
});

// ============================================================================
// 7) UYGULAMAYI İNŞA ET
// ============================================================================
// Buraya kadar "ne kullanacağımızı" söyledik.
// Build() ile uygulamayı oluşturuyoruz.
var app = builder.Build();

// ============================================================================
// 8) MIDDLEWARE PIPELINE — İsteklerin Geçtiği Katmanlar
// ============================================================================
// Middleware = Her HTTP isteğinin sırayla geçtiği "filtre" katmanları.
// İstek gelir → Middleware 1 → Middleware 2 → ... → Controller → Yanıt döner

// Sadece geliştirme ortamında Swagger'ı aç (Production'da kapalı olur)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();                      // Swagger JSON endpoint'ini aktifleştir
    app.UseSwaggerUI(c =>                  // Swagger görsel arayüzünü aktifleştir
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "YGA API v1");
        c.RoutePrefix = "swagger";         // http://localhost:5105/swagger adresinde aç
    });
}

app.UseHttpsRedirection();                 // HTTP isteklerini HTTPS'e yönlendir
app.UseMiddleware<RequestContextMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("AllowFrontend");              // Yukarıda tanımladığımız CORS politikasını uygula
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();                      // Rate limiting'i aktifleştir
app.MapControllers();                      // Controller'ları URL'lere bağla

// ============================================================================
// 9) UYGULAMAYI ÇALIŞTIR
// ============================================================================
// Bu satır uygulamayı başlatır ve gelen istekleri dinlemeye başlar.
// Ctrl+C ile durdurulana kadar çalışmaya devam eder.
app.Run();
