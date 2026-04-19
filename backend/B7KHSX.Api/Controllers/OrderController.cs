using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using B7KHSX.Api.Data;
using B7KHSX.Api.DTOs;
using B7KHSX.Api.Models;
using System.Security.Claims;

namespace B7KHSX.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Auth disabled
public class OrderController : ControllerBase
{
    private readonly AppDbContext _db;
    public OrderController(AppDbContext db) { _db = db; }

    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    private static ProductDto? ToProductDto(Product? p) => p == null ? null : new(
        p.Id, p.CodeCam, p.TenCam, p.DangEpVien, p.KichCoEpVien,
        p.KichCoDongBao, p.BatchSize, p.VatNuoi, p.Pellet, p.Packing);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] string? date,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.Orders.Include(o => o.SanPham).AsQueryable();
        if (!string.IsNullOrEmpty(type))
            query = query.Where(o => o.LoaiDatHang == type);
        if (!string.IsNullOrEmpty(date))
            query = query.Where(o => o.NgayLay == date || o.NgayDat == date);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(o => o.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new OrderDto(o.Id, o.IdSanPham, o.MaDatHang, o.SoLuong, o.NgayDat,
                o.NgayLay, o.LoaiDatHang, o.KhachVangLai, o.GhiChu,
                o.NguoiTao, o.ThoiGianTao, ToProductDto(o.SanPham)))
            .ToListAsync();

        return Ok(new PagedResult<OrderDto>(items, total, page, pageSize));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OrderCreateDto dto)
    {
        var maDatHang = await GenerateNextCode();
        var order = new Order
        {
            IdSanPham = dto.IdSanPham, SoLuong = dto.SoLuong, NgayLay = dto.NgayLay,
            GhiChu = dto.GhiChu, LoaiDatHang = dto.LoaiDatHang,
            KhachVangLai = dto.KhachVangLai, MaDatHang = maDatHang,
            NgayDat = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Đã tạo đơn hàng {maDatHang}"));
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] List<OrderCreateDto> dtos)
    {
        var maDatHang = await GenerateNextCode();
        var orders = dtos.Select(dto => new Order
        {
            IdSanPham = dto.IdSanPham, SoLuong = dto.SoLuong, NgayLay = dto.NgayLay,
            GhiChu = dto.GhiChu, LoaiDatHang = dto.LoaiDatHang,
            KhachVangLai = dto.KhachVangLai, MaDatHang = maDatHang,
            NgayDat = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        }).ToList();

        _db.Orders.AddRange(orders);
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã tạo {orders.Count} đơn hàng", MaDatHang = maDatHang });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();
        order.DaXoa = true; order.NguoiSua = GetUsername(); order.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa đơn hàng"));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _db.Orders
            .GroupBy(o => o.LoaiDatHang)
            .Select(g => new { Type = g.Key, Count = g.Count(), TotalKg = g.Sum(o => o.SoLuong) })
            .ToListAsync();
        return Ok(summary);
    }

    [HttpGet("types")]
    public IActionResult GetOrderTypes()
    {
        return Ok(new[] { "Khách vãng lai", "Đại lý Bá Cang", "Xe bồn Silo", "Forecast tuần" });
    }

    private async Task<string> GenerateNextCode()
    {
        var maxOrder = await _db.Orders.IgnoreQueryFilters()
            .Where(o => o.MaDatHang != null && o.MaDatHang.StartsWith("DH"))
            .OrderByDescending(o => o.MaDatHang)
            .Select(o => o.MaDatHang)
            .FirstOrDefaultAsync();

        int nextNum = 1;
        if (maxOrder != null && maxOrder.Length > 2 && int.TryParse(maxOrder[2..], out var current))
            nextNum = current + 1;

        return $"DH{nextNum:D5}";
    }
}
