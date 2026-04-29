using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using YGA.API.Middleware;

namespace YGA.Tests;

public class RequestContextMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ShouldSetCorrelationHeader_WhenMissing()
    {
        var context = new DefaultHttpContext();
        var middleware = new RequestContextMiddleware(
            _ => Task.CompletedTask,
            new NullLogger<RequestContextMiddleware>());

        await middleware.InvokeAsync(context);

        Assert.True(context.Response.Headers.ContainsKey("X-Correlation-Id"));
        Assert.False(string.IsNullOrWhiteSpace(context.Response.Headers["X-Correlation-Id"].ToString()));
    }
}
