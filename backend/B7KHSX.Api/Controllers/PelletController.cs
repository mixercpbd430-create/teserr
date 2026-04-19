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
public class PelletController : ControllerBase
{
    private readonly AppDbContext _db;
    public PelletController(AppDbContext db) { _db = db; }
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? soMay,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.PelletRecords.Include(p => p.SanPham).AsQueryable();
        if (!string.IsNullOrEmpty(date))
            query = query.Where(p => p.NgaySanXuat.Date == DateTime.Parse(date).Date);
        if (!string.IsNullOrEmpty(soMay))
            query = query.Where(p => p.SoMay == soMay);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.NgaySanXuat)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id, p.NgaySanXuat, p.IdSanPham, p.SoLuong, p.SoMay,
                p.ThoiGianBatDau, p.ThoiGianKetThuc, p.ThoiGianChayGio,
                p.CongSuatMay, p.GhiChu, p.NguoiTao, p.ThoiGianTao,
                SanPham = p.SanPham == null ? null : new { p.SanPham.Id, p.SanPham.CodeCam, p.SanPham.TenCam, p.SanPham.DangEpVien }
            }).ToListAsync();

        return Ok(new { items, totalCount = total, page, pageSize });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string date)
    {
        var d = DateTime.Parse(date).Date;
        var records = await _db.PelletRecords
            .Where(p => p.NgaySanXuat.Date == d)
            .GroupBy(p => p.SoMay)
            .Select(g => new { SoMay = g.Key, TongSoLuong = g.Sum(p => p.SoLuong), SoDong = g.Count(),
                TongGio = g.Sum(p => p.ThoiGianChayGio ?? 0) })
            .ToListAsync();

        return Ok(new
        {
            TongSanLuong = records.Sum(r => r.TongSoLuong),
            TongGioChay = records.Sum(r => r.TongGio),
            SoMay = records.Count,
            ChiTietMay = records
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PelletCreateRequest dto)
    {
        var record = new PelletRecord
        {
            NgaySanXuat = dto.NgaySanXuat, IdSanPham = dto.IdSanPham, SoLuong = dto.SoLuong,
            SoMay = dto.SoMay, ThoiGianBatDau = dto.ThoiGianBatDau, ThoiGianKetThuc = dto.ThoiGianKetThuc,
            ThoiGianChayGio = dto.ThoiGianChayGio, CongSuatMay = dto.CongSuatMay, GhiChu = dto.GhiChu,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.PelletRecords.Add(record);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã thêm bản ghi pellet"));
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] List<PelletCreateRequest> dtos)
    {
        var records = dtos.Select(dto => new PelletRecord
        {
            NgaySanXuat = dto.NgaySanXuat, IdSanPham = dto.IdSanPham, SoLuong = dto.SoLuong,
            SoMay = dto.SoMay, ThoiGianBatDau = dto.ThoiGianBatDau, ThoiGianKetThuc = dto.ThoiGianKetThuc,
            ThoiGianChayGio = dto.ThoiGianChayGio, CongSuatMay = dto.CongSuatMay, GhiChu = dto.GhiChu,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        }).ToList();
        _db.PelletRecords.AddRange(records);
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã thêm {records.Count} bản ghi", Count = records.Count });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PelletCreateRequest dto)
    {
        var r = await _db.PelletRecords.FindAsync(id);
        if (r == null) return NotFound();
        r.NgaySanXuat = dto.NgaySanXuat; r.IdSanPham = dto.IdSanPham; r.SoLuong = dto.SoLuong;
        r.SoMay = dto.SoMay; r.ThoiGianBatDau = dto.ThoiGianBatDau; r.ThoiGianKetThuc = dto.ThoiGianKetThuc;
        r.ThoiGianChayGio = dto.ThoiGianChayGio; r.CongSuatMay = dto.CongSuatMay; r.GhiChu = dto.GhiChu;
        r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Cập nhật thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.PelletRecords.FindAsync(id);
        if (r == null) return NotFound();
        r.DaXoa = true; r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa"));
    }

    [HttpGet("machines")]
    public async Task<IActionResult> GetMachines()
    {
        var machines = await _db.PelletRecords
            .Select(p => p.SoMay).Distinct().OrderBy(m => m).ToListAsync();
        return Ok(machines);
    }
}

public record PelletCreateRequest(DateTime NgaySanXuat, int? IdSanPham, double SoLuong,
    string SoMay, DateTime? ThoiGianBatDau, DateTime? ThoiGianKetThuc,
    double? ThoiGianChayGio, double? CongSuatMay, string? GhiChu);
