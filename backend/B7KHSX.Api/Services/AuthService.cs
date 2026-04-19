using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using B7KHSX.Api.Data;
using B7KHSX.Api.DTOs;

namespace B7KHSX.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.VaiTro)
            .FirstOrDefaultAsync(u => u.Username == request.Username.ToLower() && !u.IsLock);

        if (user == null || string.IsNullOrEmpty(user.Password))
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
            return null;

        var token = GenerateJwtToken(user);

        return new LoginResponse(
            Token: token,
            Username: user.Username,
            Fullname: user.Fullname ?? user.Username,
            Role: user.VaiTro?.VaiTro ?? "Unknown",
            RoleId: user.IdVaiTro ?? 0
        );
    }

    private string GenerateJwtToken(Models.User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "B7KHSX_SuperSecretKey_2024_Production_Planning_System_Key!")
        );
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("fullname", user.Fullname ?? ""),
            new Claim(ClaimTypes.Role, user.VaiTro?.VaiTro ?? ""),
            new Claim("role_id", user.IdVaiTro?.ToString() ?? "0")
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "B7KHSX",
            audience: _config["Jwt:Audience"] ?? "B7KHSX-Client",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
