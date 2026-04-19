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
public class PlanController : ControllerBase
{
    private readonly AppDbContext _db;
    public PlanController(AppDbContext db) { _db = db; }

    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    private static ProductDto? ToProductDto(Product? p) => p == null ? null : new(
        p.Id, p.CodeCam, p.TenCam, p.DangEpVien, p.KichCoEpVien,
        p.KichCoDongBao, p.BatchSize, p.VatNuoi, p.Pellet, p.Packing);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] string? maPlan,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.Plans.Include(p => p.SanPham).AsQueryable();
        if (!string.IsNullOrEmpty(date))
            query = query.Where(p => p.NgayPlan == date);
        if (!string.IsNullOrEmpty(maPlan))
            query = query.Where(p => p.MaPlan == maPlan);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new PlanDto(p.Id, p.IdSanPham, p.MaPlan, p.SoLuong, p.NgayPlan,
                p.GhiChu, p.NguoiTao, p.ThoiGianTao, ToProductDto(p.SanPham)))
            .ToListAsync();

        return Ok(new PagedResult<PlanDto>(items, total, page, pageSize));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string date)
    {
        var plans = await _db.Plans
            .Where(p => p.NgayPlan == date)
            .GroupBy(p => p.IdSanPham)
            .Select(g => new { IdSanPham = g.Key, TongSoLuong = g.Sum(p => p.SoLuong), SoLuongDong = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            SoSanPham = plans.Count,
            TongSoLuong = plans.Sum(p => p.TongSoLuong),
            TongSoDong = plans.Sum(p => p.SoLuongDong)
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PlanCreateDto dto)
    {
        var maPlan = await GenerateNextCode();
        var plan = new Plan
        {
            IdSanPham = dto.IdSanPham, SoLuong = dto.SoLuong, NgayPlan = dto.NgayPlan,
            GhiChu = dto.GhiChu, MaPlan = maPlan,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.Plans.Add(plan);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Đã tạo plan {maPlan}"));
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] PlanBatchCreateDto dto)
    {
        var maPlan = await GenerateNextCode();
        var plans = dto.Items.Select(item => new Plan
        {
            IdSanPham = item.IdSanPham, SoLuong = item.SoLuong,
            NgayPlan = dto.NgayPlan, GhiChu = item.GhiChu, MaPlan = maPlan,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        }).ToList();

        _db.Plans.AddRange(plans);
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã tạo {plans.Count} plan với mã {maPlan}", MaPlan = maPlan, Count = plans.Count });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PlanCreateDto dto)
    {
        var plan = await _db.Plans.FindAsync(id);
        if (plan == null) return NotFound();
        plan.IdSanPham = dto.IdSanPham; plan.SoLuong = dto.SoLuong;
        plan.NgayPlan = dto.NgayPlan; plan.GhiChu = dto.GhiChu;
        plan.NguoiSua = GetUsername(); plan.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Cập nhật thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var plan = await _db.Plans.FindAsync(id);
        if (plan == null) return NotFound();
        plan.DaXoa = true; plan.NguoiSua = GetUsername(); plan.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa plan"));
    }

    [HttpDelete("by-date/{date}")]
    public async Task<IActionResult> DeleteByDate(string date)
    {
        var plans = await _db.Plans.Where(p => p.NgayPlan == date).ToListAsync();
        foreach (var p in plans) { p.DaXoa = true; p.NguoiSua = GetUsername(); p.ThoiGianSua = DateTime.UtcNow; }
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Đã xóa {plans.Count} plan cho ngày {date}"));
    }

    [HttpGet("codes")]
    public async Task<IActionResult> GetPlanCodes([FromQuery] string date)
    {
        var codes = await _db.Plans
            .Where(p => p.NgayPlan == date)
            .GroupBy(p => p.MaPlan)
            .Select(g => new { MaPlan = g.Key, Count = g.Count(), Total = g.Sum(p => p.SoLuong) })
            .ToListAsync();
        return Ok(codes);
    }

    private async Task<string> GenerateNextCode()
    {
        var maxPlan = await _db.Plans.IgnoreQueryFilters()
            .Where(p => p.MaPlan != null && p.MaPlan.StartsWith("PL"))
            .OrderByDescending(p => p.MaPlan)
            .Select(p => p.MaPlan)
            .FirstOrDefaultAsync();

        int nextNum = 1;
        if (maxPlan != null && maxPlan.Length > 2 && int.TryParse(maxPlan[2..], out var current))
            nextNum = current + 1;

        return $"PL{nextNum:D5}";
    }
}
