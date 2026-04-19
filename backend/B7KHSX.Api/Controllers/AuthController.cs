using Microsoft.AspNetCore.Mvc;
using B7KHSX.Api.DTOs;
using B7KHSX.Api.Services;

namespace B7KHSX.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result == null)
            return Unauthorized(new ApiResponse(false, "Username hoặc mật khẩu không đúng"));

        return Ok(result);
    }
}
