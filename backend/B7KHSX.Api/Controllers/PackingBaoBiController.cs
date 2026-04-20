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
public class PackingController : ControllerBase
{
    private readonly AppDbContext _db;
    public PackingController(AppDbContext db) { _db = db; }
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? date, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.PackingPlans.Include(p => p.SanPham).AsQueryable();
        if (!string.IsNullOrEmpty(date))
            query = query.Where(p => p.NgayDongBao.Date == DateTime.Parse(date).Date);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.NgayDongBao)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id, p.NgayDongBao, p.IdPellet, p.IdSanPham, p.SoLuongTan, p.KichCoBaoKg,
                p.SoBao, p.LineDongBao, p.GhiChu, p.NguoiTao, p.ThoiGianTao,
                SanPham = p.SanPham == null ? null : new { p.SanPham.Id, p.SanPham.CodeCam, p.SanPham.TenCam }
            }).ToListAsync();

        return Ok(new { items, totalCount = total, page, pageSize });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PackingCreateRequest dto)
    {
        var record = new PackingPlan
        {
            NgayDongBao = dto.NgayDongBao, IdPellet = dto.IdPellet, IdSanPham = dto.IdSanPham,
            SoLuongTan = dto.SoLuongTan, KichCoBaoKg = dto.KichCoBaoKg, SoBao = dto.SoBao,
            LineDongBao = dto.LineDongBao, GhiChu = dto.GhiChu,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.PackingPlans.Add(record);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã thêm packing plan"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PackingCreateRequest dto)
    {
        var r = await _db.PackingPlans.FindAsync(id);
        if (r == null) return NotFound();
        r.NgayDongBao = dto.NgayDongBao; r.IdPellet = dto.IdPellet; r.IdSanPham = dto.IdSanPham;
        r.SoLuongTan = dto.SoLuongTan; r.KichCoBaoKg = dto.KichCoBaoKg; r.SoBao = dto.SoBao;
        r.LineDongBao = dto.LineDongBao; r.GhiChu = dto.GhiChu;
        r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Cập nhật thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.PackingPlans.FindAsync(id);
        if (r == null) return NotFound();
        r.DaXoa = true; r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa"));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string date)
    {
        var d = DateTime.Parse(date).Date;
        var records = await _db.PackingPlans.Where(p => p.NgayDongBao.Date == d).ToListAsync();
        return Ok(new
        {
            TongSoLuongTan = records.Sum(r => r.SoLuongTan),
            TongSoBao = records.Sum(r => r.SoBao ?? 0),
            SoDong = records.Count
        });
    }
}

public record PackingCreateRequest(DateTime NgayDongBao, int? IdPellet, int? IdSanPham,
    double SoLuongTan, double KichCoBaoKg, int? SoBao, string LineDongBao, string? GhiChu);

// ==================== BaoBi Controller ====================

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Auth disabled
public class BaoBiController : ControllerBase
{
    private readonly AppDbContext _db;
    public BaoBiController(AppDbContext db) { _db = db; }
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.BaoBis.Where(b => !b.DaXoa).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.LoaiBao.Contains(search));

        var total = await query.CountAsync();

        // Calculate full-dataset totals (not just current page)
        var allItems = await query.ToListAsync();
        var totalBao = allItems.Sum(b => b.TonKhoHienTai);
        var totalKg = allItems.Sum(b => (long)(b.KichCoKg * b.TonKhoHienTai));

        var items = allItems.OrderByDescending(b => b.NgayKiemTra)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(b => new
            {
                b.Id, b.NgayKiemTra, b.LoaiBao, b.KichCoKg, b.TonKhoHienTai,
                b.NhuCauDuKien, b.MucCanhBao, b.SoLuongThieu, b.GhiChu
            }).ToList();

        return Ok(new { items, totalCount = total, page, pageSize, totalBao, totalKg });
    }

    [HttpGet("dates")]
    public async Task<IActionResult> GetDatesWithData([FromQuery] int year, [FromQuery] int month)
    {
        var start = new DateTime(year, month, 1);
        var end = start.AddMonths(1);
        var dates = await _db.BaoBis
            .Where(b => !b.DaXoa && b.NgayKiemTra >= start && b.NgayKiemTra < end)
            .Select(b => b.NgayKiemTra.Day)
            .Distinct()
            .ToListAsync();
        return Ok(dates);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BaoBiCreateRequest dto)
    {
        var record = new BaoBi
        {
            NgayKiemTra = dto.NgayKiemTra, LoaiBao = dto.LoaiBao, KichCoKg = dto.KichCoKg,
            TonKhoHienTai = dto.TonKhoHienTai, NhuCauDuKien = dto.NhuCauDuKien,
            MucCanhBao = dto.MucCanhBao, SoLuongThieu = dto.SoLuongThieu, GhiChu = dto.GhiChu,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.BaoBis.Add(record);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã thêm bao bì"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] BaoBiCreateRequest dto)
    {
        var r = await _db.BaoBis.FindAsync(id);
        if (r == null) return NotFound();
        r.NgayKiemTra = dto.NgayKiemTra; r.LoaiBao = dto.LoaiBao; r.KichCoKg = dto.KichCoKg;
        r.TonKhoHienTai = dto.TonKhoHienTai; r.NhuCauDuKien = dto.NhuCauDuKien;
        r.MucCanhBao = dto.MucCanhBao; r.SoLuongThieu = dto.SoLuongThieu; r.GhiChu = dto.GhiChu;
        r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Cập nhật thành công"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var r = await _db.BaoBis.FindAsync(id);
        if (r == null) return NotFound();
        r.DaXoa = true; r.NguoiSua = GetUsername(); r.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa"));
    }
}

public record BaoBiCreateRequest(DateTime NgayKiemTra, string LoaiBao, double KichCoKg,
    int TonKhoHienTai, int? NhuCauDuKien, string? MucCanhBao, int? SoLuongThieu, string? GhiChu);

// ==================== BaoBi Scan (Email Auto-Import) ====================

[ApiController]
[Route("api/import")]
public class BaoBiScanController : ControllerBase
{
    private readonly AppDbContext _db;
    public BaoBiScanController(AppDbContext db) { _db = db; }

    [HttpPost("baobi-scan")]
    public async Task<IActionResult> ImportBaoBiScan([FromBody] BaoBiScanRequest request)
    {
        try
        {
            int updated = 0, created = 0;
            
            if (!DateTime.TryParse(request.Date, out var scanDate))
                scanDate = DateTime.UtcNow;

            foreach (var item in request.Items)
            {
                if (string.IsNullOrWhiteSpace(item.LoaiBao)) continue;

                // Upsert by LoaiBao + KichCoKg
                var existing = _db.BaoBis.FirstOrDefault(b =>
                    b.LoaiBao == item.LoaiBao && b.KichCoKg == item.KichCoKg && !b.DaXoa);

                if (existing != null)
                {
                    existing.TonKhoHienTai = item.TonKhoHienTai;
                    existing.NgayKiemTra = scanDate;
                    existing.GhiChu = request.Source;
                    existing.NguoiSua = "email-scanner";
                    existing.ThoiGianSua = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    _db.BaoBis.Add(new BaoBi
                    {
                        LoaiBao = item.LoaiBao,
                        KichCoKg = item.KichCoKg,
                        TonKhoHienTai = item.TonKhoHienTai,
                        NgayKiemTra = scanDate,
                        GhiChu = request.Source,
                        NguoiTao = "email-scanner",
                        ThoiGianTao = DateTime.UtcNow,
                    });
                    created++;
                }
            }
            await _db.SaveChangesAsync();

            return Ok(new {
                Success = true,
                Message = $"Bao bì scan: {updated} updated, {created} created",
                Updated = updated, Created = created,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = ex.Message, Detail = ex.InnerException?.Message });
        }
    }
}

public record BaoBiScanRequest(string Date, string? Source, List<BaoBiScanItem> Items);
public record BaoBiScanItem(string LoaiBao, double KichCoKg, int TonKhoHienTai);
