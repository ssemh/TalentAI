using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using YGA.API.Middleware;

namespace YGA.Tests;

public class GlobalExceptionMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_WhenInvalidOperationException_ReturnsBadRequest()
    {
        var context = new DefaultHttpContext();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new InvalidOperationException("invalid operation"),
            new NullLogger<GlobalExceptionMiddleware>());

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenUnhandledException_ReturnsInternalServerError()
    {
        var context = new DefaultHttpContext();
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new Exception("boom"),
            new NullLogger<GlobalExceptionMiddleware>());

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
    }
}
