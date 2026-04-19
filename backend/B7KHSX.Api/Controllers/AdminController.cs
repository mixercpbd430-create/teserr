using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using B7KHSX.Api.Data;
using B7KHSX.Api.DTOs;
using B7KHSX.Api.Models;
using System.Security.Claims;

namespace B7KHSX.Api.Controllers;

// ==================== Admin: Users ====================
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUserController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminUserController(AppDbContext db) { _db = db; }
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users.Include(u => u.VaiTro)
            .Select(u => new
            {
                u.Id, u.Username, u.Fullname, u.Email, u.SoDienThoai,
                u.IsLock, u.IdVaiTro, VaiTro = u.VaiTro != null ? u.VaiTro.VaiTro : null,
                u.ThoiGianTao
            }).ToListAsync();
        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserCreateRequest dto)
    {
        if (await _db.Users.AnyAsync(u => u.Username == dto.Username.ToLower()))
            return BadRequest(new ApiResponse(false, "Username đã tồn tại"));

        var user = new User
        {
            Username = dto.Username.ToLower(),
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Fullname = dto.Fullname, Email = dto.Email, SoDienThoai = dto.SoDienThoai,
            IdVaiTro = dto.IdVaiTro, IsLock = false,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Đã tạo user {dto.Username}"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserUpdateRequest dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Fullname = dto.Fullname; user.Email = dto.Email;
        user.SoDienThoai = dto.SoDienThoai; user.IdVaiTro = dto.IdVaiTro;
        user.NguoiSua = GetUsername(); user.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Cập nhật thành công"));
    }

    [HttpPut("{id}/password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] PasswordResetRequest dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.NguoiSua = GetUsername(); user.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã đổi mật khẩu"));
    }

    [HttpPut("{id}/lock")]
    public async Task<IActionResult> ToggleLock(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsLock = !user.IsLock;
        user.NguoiSua = GetUsername(); user.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, user.IsLock ? "Đã khóa" : "Đã mở khóa"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.DaXoa = true; user.NguoiSua = GetUsername(); user.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa user"));
    }
}

public record UserCreateRequest(string Username, string Password, string? Fullname,
    string? Email, string? SoDienThoai, int IdVaiTro);
public record UserUpdateRequest(string? Fullname, string? Email, string? SoDienThoai, int? IdVaiTro);
public record PasswordResetRequest(string NewPassword);

// ==================== Admin: Roles ====================
[ApiController]
[Route("api/admin/roles")]
[Authorize(Roles = "Admin")]
public class AdminRoleController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminRoleController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.Roles.OrderBy(r => r.ThuTuUuTien)
            .Select(r => new { r.Id, r.VaiTro, r.ThuTuUuTien }).ToListAsync();
        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoleCreateRequest dto)
    {
        _db.Roles.Add(new Role { VaiTro = dto.VaiTro, ThuTuUuTien = dto.ThuTuUuTien });
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã tạo vai trò"));
    }
}

public record RoleCreateRequest(string VaiTro, int? ThuTuUuTien);

// ==================== Admin: Menu Management ====================
[ApiController]
[Route("api/admin/menu")]
[Authorize(Roles = "Admin")]
public class AdminMenuController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminMenuController(AppDbContext db) { _db = db; }

    [HttpGet("main-functions")]
    public async Task<IActionResult> GetMainFunctions()
    {
        var items = await _db.MainFunctions.OrderBy(f => f.ThuTuUuTien)
            .Select(f => new { f.Id, f.ChucNangChinh, f.Router, f.Icon, f.ThuTuUuTien })
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("main-functions")]
    public async Task<IActionResult> CreateMainFunction([FromBody] MainFunctionCreateRequest dto)
    {
        _db.MainFunctions.Add(new MainFunction
        {
            ChucNangChinh = dto.ChucNangChinh, Router = dto.Router,
            Icon = dto.Icon, ThuTuUuTien = dto.ThuTuUuTien
        });
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã tạo chức năng chính"));
    }

    [HttpGet("sub-functions")]
    public async Task<IActionResult> GetSubFunctions()
    {
        var items = await _db.SubFunctions.Include(f => f.ChucNangChinh)
            .OrderBy(f => f.IdChucNangChinh).ThenBy(f => f.ThuTuUuTien)
            .Select(f => new
            {
                f.Id, f.IdChucNangChinh, f.ChucNangCon, f.Router, f.Icon, f.ThuTuUuTien,
                ChucNangChinh = f.ChucNangChinh != null ? f.ChucNangChinh.ChucNangChinh : null
            }).ToListAsync();
        return Ok(items);
    }

    [HttpPost("sub-functions")]
    public async Task<IActionResult> CreateSubFunction([FromBody] SubFunctionCreateRequest dto)
    {
        _db.SubFunctions.Add(new SubFunction
        {
            IdChucNangChinh = dto.IdChucNangChinh, ChucNangCon = dto.ChucNangCon,
            Router = dto.Router, Icon = dto.Icon, ThuTuUuTien = dto.ThuTuUuTien
        });
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã tạo chức năng con"));
    }

    [HttpGet("role-functions/{roleId}")]
    public async Task<IActionResult> GetRoleFunctions(int roleId)
    {
        var assigned = await _db.RoleFunctions.Where(rf => rf.IdVaiTro == roleId)
            .Select(rf => rf.IdDanhSachChucNang).ToListAsync();
        return Ok(assigned);
    }

    [HttpPost("role-functions")]
    public async Task<IActionResult> SetRoleFunctions([FromBody] SetRoleFunctionsRequest dto)
    {
        // Remove existing
        var existing = await _db.RoleFunctions.Where(rf => rf.IdVaiTro == dto.IdVaiTro).ToListAsync();
        _db.RoleFunctions.RemoveRange(existing);

        // Add new
        foreach (var funcId in dto.FunctionIds)
        {
            _db.RoleFunctions.Add(new RoleFunction { IdVaiTro = dto.IdVaiTro, IdDanhSachChucNang = funcId });
        }
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Đã cập nhật {dto.FunctionIds.Count} quyền"));
    }
}

public record MainFunctionCreateRequest(string ChucNangChinh, string? Router, string? Icon, int? ThuTuUuTien);
public record SubFunctionCreateRequest(int IdChucNangChinh, string ChucNangCon, string? Router, string? Icon, int ThuTuUuTien);
public record SetRoleFunctionsRequest(int IdVaiTro, List<int> FunctionIds);
