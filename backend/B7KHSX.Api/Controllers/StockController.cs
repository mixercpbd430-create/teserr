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
public class StockController : ControllerBase
{
    private readonly AppDbContext _db;
    public StockController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.StockTodays.Include(s => s.SanPham).AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(s => s.SanPham != null &&
                ((s.SanPham.TenCam != null && s.SanPham.TenCam.Contains(search)) ||
                 (s.SanPham.CodeCam != null && s.SanPham.CodeCam.Contains(search))));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(s => s.SoLuong)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new StockDto(s.Id, s.IdSanPham, s.SoLuong, s.NgayCapNhat, s.GhiChu,
                s.SanPham == null ? null : new ProductDto(s.SanPham.Id, s.SanPham.CodeCam, s.SanPham.TenCam,
                    s.SanPham.DangEpVien, s.SanPham.KichCoEpVien, s.SanPham.KichCoDongBao,
                    s.SanPham.BatchSize, s.SanPham.VatNuoi, s.SanPham.Pellet, s.SanPham.Packing)))
            .ToListAsync();

        return Ok(new PagedResult<StockDto>(items, total, page, pageSize));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalProducts = await _db.StockTodays.CountAsync();
        var totalStock = await _db.StockTodays.SumAsync(s => s.SoLuong);
        return Ok(new { TotalProducts = totalProducts, TotalStock = totalStock, TotalStockTan = totalStock / 1000 });
    }
}

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Auth disabled
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) { _db = db; }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var totalProducts = await _db.Products.CountAsync();
        var totalPlansToday = await _db.Plans.Where(p => p.NgayPlan == today).CountAsync();
        var totalProductionToday = await _db.Plans.Where(p => p.NgayPlan == today).SumAsync(p => (double?)p.SoLuong) ?? 0;
        var totalOrders = await _db.Orders.CountAsync();
        var totalStock = await _db.StockTodays.SumAsync(s => (double?)s.SoLuong) ?? 0;

        return Ok(new DashboardDto(totalProducts, totalPlansToday, totalProductionToday, totalOrders, totalStock));
    }
}
