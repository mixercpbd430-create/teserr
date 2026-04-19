using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using B7KHSX.Api.Data;
using B7KHSX.Api.DTOs;
using System.Security.Claims;

namespace B7KHSX.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Auth disabled
public class MenuController : ControllerBase
{
    private readonly AppDbContext _db;

    public MenuController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetMenu()
    {
        var roleIdClaim = User.FindFirst("role_id")?.Value;
        if (string.IsNullOrEmpty(roleIdClaim) || !int.TryParse(roleIdClaim, out var roleId))
            return Unauthorized();

        var roleFunctions = await _db.RoleFunctions
            .Where(rf => rf.IdVaiTro == roleId)
            .Select(rf => rf.IdDanhSachChucNang)
            .ToListAsync();

        var subFunctions = await _db.SubFunctions
            .Include(sf => sf.ChucNangChinh)
            .Where(sf => roleFunctions.Contains(sf.Id))
            .OrderBy(sf => sf.ChucNangChinh!.ThuTuUuTien)
            .ThenBy(sf => sf.ThuTuUuTien)
            .ToListAsync();

        var grouped = subFunctions
            .GroupBy(sf => sf.ChucNangChinh)
            .Where(g => g.Key != null)
            .Select(g => new MenuGroupDto(
                Id: g.Key!.Id,
                Name: g.Key.ChucNangChinh,
                Icon: g.Key.Icon,
                Order: g.Key.ThuTuUuTien ?? 0,
                Items: g.Select(sf => new MenuItemDto(
                    Id: sf.Id,
                    Name: sf.ChucNangCon,
                    Icon: sf.Icon,
                    Router: sf.Router,
                    Order: sf.ThuTuUuTien
                )).OrderBy(i => i.Order).ToList()
            ))
            .OrderBy(mg => mg.Order)
            .ToList();

        return Ok(grouped);
    }
}
