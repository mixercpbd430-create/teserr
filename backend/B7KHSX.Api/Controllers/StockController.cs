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

    [HttpGet("monthly-summary")]
    public async Task<IActionResult> GetMonthlySummary([FromQuery] int year, [FromQuery] int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var result = new List<object>();

        // Stock daily: group by NgayCapNhat (string "yyyy-MM-dd")
        var stockData = await _db.StockTodays
            .Where(s => s.NgayCapNhat != null && s.NgayCapNhat.StartsWith($"{year:D4}-{month:D2}"))
            .GroupBy(s => s.NgayCapNhat)
            .Select(g => new { Date = g.Key, Total = g.Sum(x => x.SoLuong) })
            .ToListAsync();

        // Packing daily: group by NgayDongBao (DateTime)
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1);
        var packingData = await _db.PackingPlans
            .Where(p => p.NgayDongBao >= startDate && p.NgayDongBao < endDate)
            .GroupBy(p => p.NgayDongBao.Day)
            .Select(g => new { Day = g.Key, Total = g.Sum(x => x.SoLuongTan) })
            .ToListAsync();

        // Sale (Order) daily: group by NgayLay (string "yyyy-MM-dd")
        var saleData = await _db.Orders
            .Where(o => o.NgayLay != null && o.NgayLay.StartsWith($"{year:D4}-{month:D2}"))
            .GroupBy(o => o.NgayLay)
            .Select(g => new { Date = g.Key, Total = g.Sum(x => x.SoLuong) })
            .ToListAsync();

        // Build daily arrays
        var stockDaily = new double[daysInMonth];
        var packingDaily = new double[daysInMonth];
        var saleDaily = new double[daysInMonth];

        foreach (var s in stockData)
        {
            if (s.Date != null && DateTime.TryParse(s.Date, out var dt))
                stockDaily[dt.Day - 1] = s.Total;
        }
        foreach (var p in packingData)
        {
            if (p.Day >= 1 && p.Day <= daysInMonth)
                packingDaily[p.Day - 1] = p.Total;
        }
        foreach (var o in saleData)
        {
            if (o.Date != null && DateTime.TryParse(o.Date, out var dt))
                saleDaily[dt.Day - 1] = o.Total;
        }

        return Ok(new
        {
            Year = year,
            Month = month,
            DaysInMonth = daysInMonth,
            Stock = stockDaily,
            Packing = packingDaily,
            Sale = saleDaily
        });
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
