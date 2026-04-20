using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using B7KHSX.Api.Data;
using B7KHSX.Api.DTOs;
using System.Security.Claims;

namespace B7KHSX.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Auth disabled
public class ImportController : ControllerBase
{
    private readonly AppDbContext _db;
    public ImportController(AppDbContext db) { _db = db; }
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    /// <summary>
    /// Generic Excel import endpoint. Accepts JSON array of records with target table info.
    /// Frontend handles Excel parsing (via SheetJS), sends parsed JSON to this endpoint.
    /// </summary>
    [HttpPost("plan")]
    public async Task<IActionResult> ImportPlan([FromBody] ImportPlanRequest request)
    {
        int count = 0;
        foreach (var item in request.Items)
        {
            _db.Plans.Add(new Models.Plan
            {
                IdSanPham = item.IdSanPham, SoLuong = item.SoLuong,
                NgayPlan = request.NgayPlan, MaPlan = request.MaPlan,
                GhiChu = item.GhiChu,
                NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
            });
            count++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã import {count} bản ghi plan", Count = count });
    }

    [HttpPost("order")]
    public async Task<IActionResult> ImportOrder([FromBody] ImportOrderRequest request)
    {
        int count = 0;
        foreach (var item in request.Items)
        {
            _db.Orders.Add(new Models.Order
            {
                IdSanPham = item.IdSanPham, SoLuong = item.SoLuong,
                NgayDat = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                NgayLay = item.NgayLay,
                LoaiDatHang = item.LoaiDatHang ?? request.LoaiDatHang,
                KhachVangLai = (item.LoaiDatHang ?? request.LoaiDatHang) == "Khách vãng lai" ? 1 : 0,
                MaDatHang = request.MaDatHang, GhiChu = item.GhiChu,
                NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
            });
            count++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã import {count} đơn hàng", Count = count });
    }

    [HttpPost("pellet")]
    public async Task<IActionResult> ImportPellet([FromBody] ImportPelletRequest request)
    {
        int count = 0;
        foreach (var item in request.Items)
        {
            _db.PelletRecords.Add(new Models.PelletRecord
            {
                NgaySanXuat = request.NgaySanXuat, IdSanPham = item.IdSanPham,
                SoLuong = item.SoLuong, SoMay = item.SoMay ?? "M1",
                ThoiGianChayGio = item.ThoiGianChayGio, CongSuatMay = item.CongSuatMay,
                GhiChu = item.GhiChu,
                NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
            });
            count++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã import {count} bản ghi pellet", Count = count });
    }

    [HttpPost("stock")]
    public async Task<IActionResult> ImportStock([FromBody] ImportStockRequest request)
    {
        int count = 0;
        foreach (var item in request.Items)
        {
            // Upsert: update if exists, insert if not
            var existing = _db.StockTodays
                .FirstOrDefault(s => s.IdSanPham == item.IdSanPham && !s.DaXoa);
            if (existing != null)
            {
                existing.SoLuong = item.SoLuong;
                existing.NgayCapNhat = request.NgayCapNhat;
                existing.NguoiSua = GetUsername();
                existing.ThoiGianSua = DateTime.UtcNow;
            }
            else
            {
                _db.StockTodays.Add(new Models.StockToday
                {
                    IdSanPham = item.IdSanPham, SoLuong = item.SoLuong,
                    NgayCapNhat = request.NgayCapNhat, GhiChu = item.GhiChu,
                    NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
                });
            }
            count++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã import/cập nhật {count} bản ghi stock", Count = count });
    }

    [HttpPost("product")]
    public async Task<IActionResult> ImportProduct([FromBody] List<ImportProductItem> items)
    {
        int count = 0;
        foreach (var item in items)
        {
            if (!_db.Products.Any(p => p.CodeCam == item.CodeCam && !p.DaXoa))
            {
                _db.Products.Add(new Models.Product
                {
                    CodeCam = item.CodeCam, TenCam = item.TenCam,
                    DangEpVien = item.DangEpVien, KichCoEpVien = item.KichCoEpVien,
                    BatchSize = item.BatchSize, VatNuoi = item.VatNuoi,
                    NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
                });
                count++;
            }
        }
        await _db.SaveChangesAsync();
        return Ok(new { Success = true, Message = $"Đã import {count} sản phẩm mới", Count = count });
    }
    [HttpPost("stock-scan")]
    public async Task<IActionResult> ImportStockScan([FromBody] ImportStockScanRequest request)
    {
        try
        {
            int updated = 0, created = 0;
            var newProducts = new List<string>();

            foreach (var item in request.Items)
            {
                if (string.IsNullOrWhiteSpace(item.CodeCam)) continue;

                // Find or create product by codeCam
                var product = _db.Products.FirstOrDefault(p => p.CodeCam == item.CodeCam && !p.DaXoa);
                if (product == null)
                {
                    // Auto-create product
                    product = new Models.Product
                    {
                        CodeCam = item.CodeCam,
                        TenCam = item.TenCam ?? item.CodeCam,
                        Packing = item.PackSize,
                        NguoiTao = "email-scanner",
                        ThoiGianTao = DateTime.UtcNow,
                    };
                    _db.Products.Add(product);
                    await _db.SaveChangesAsync(); // Save to get Id
                    newProducts.Add($"{item.CodeCam} ({item.TenCam})");
                }

                // Upsert stock
                var existing = _db.StockTodays
                    .FirstOrDefault(s => s.IdSanPham == product.Id && !s.DaXoa);
                if (existing != null)
                {
                    existing.SoLuong = item.SoLuong;
                    existing.NgayCapNhat = request.Date;
                    existing.GhiChu = request.Source;
                    existing.NguoiSua = "email-scanner";
                    existing.ThoiGianSua = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    _db.StockTodays.Add(new Models.StockToday
                    {
                        IdSanPham = product.Id,
                        SoLuong = item.SoLuong,
                        NgayCapNhat = request.Date,
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
                Message = $"Stock scan: {updated} updated, {created} created, {newProducts.Count} new products",
                Updated = updated, Created = created,
                NewProducts = newProducts,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = ex.Message, Detail = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Bulk import stock history (INSERT, no upsert) - for SQLite sync
    /// </summary>
    [HttpPost("stock-history")]
    public async Task<IActionResult> ImportStockHistory([FromBody] ImportStockRequest request)
    {
        try
        {
            int count = 0;
            foreach (var item in request.Items)
            {
                _db.StockTodays.Add(new Models.StockToday
                {
                    IdSanPham = item.IdSanPham, SoLuong = item.SoLuong,
                    NgayCapNhat = request.NgayCapNhat, GhiChu = item.GhiChu ?? "Sync từ SQLite",
                    NguoiTao = "sync", ThoiGianTao = DateTime.UtcNow
                });
                count++;
            }
            await _db.SaveChangesAsync();
            return Ok(new { Success = true, Message = $"Đã import {count} stock history records", Count = count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = ex.Message, Detail = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Bulk import packing records - for SQLite sync
    /// </summary>
    [HttpPost("packing-bulk")]
    public async Task<IActionResult> ImportPackingBulk([FromBody] ImportPackingBulkRequest request)
    {
        try
        {
            int count = 0;
            foreach (var item in request.Items)
            {
                if (!DateTime.TryParse(item.NgayDongBao, out var ngay))
                    ngay = DateTime.UtcNow;

                _db.PackingPlans.Add(new Models.PackingPlan
                {
                    NgayDongBao = ngay,
                    IdSanPham = item.IdSanPham,
                    SoLuongTan = item.SoLuongTan,
                    KichCoBaoKg = item.KichCoBaoKg > 0 ? item.KichCoBaoKg : 25,
                    SoBao = item.SoBao,
                    LineDongBao = item.LineDongBao ?? "L1",
                    GhiChu = item.GhiChu ?? "Sync từ SQLite",
                    NguoiTao = "sync",
                    ThoiGianTao = DateTime.UtcNow,
                });
                count++;
            }
            await _db.SaveChangesAsync();
            return Ok(new { Success = true, Message = $"Đã import {count} packing records", Count = count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = ex.Message, Detail = ex.InnerException?.Message });
        }
    }
}

// Import request DTOs
public record ImportPlanRequest(string? NgayPlan, string? MaPlan, List<ImportPlanItem> Items);
public record ImportPlanItem(int IdSanPham, double SoLuong, string? GhiChu);

public record ImportOrderRequest(string? LoaiDatHang, string? MaDatHang, List<ImportOrderItem> Items);
public record ImportOrderItem(int IdSanPham, double SoLuong, string? NgayLay, string? GhiChu, string? LoaiDatHang = null);

public record ImportPelletRequest(DateTime NgaySanXuat, List<ImportPelletItem> Items);
public record ImportPelletItem(int IdSanPham, double SoLuong, string? SoMay, double? ThoiGianChayGio, double? CongSuatMay, string? GhiChu);

public record ImportStockRequest(string NgayCapNhat, List<ImportStockItem> Items);
public record ImportStockItem(int IdSanPham, double SoLuong, string? GhiChu);

public record ImportProductItem(string CodeCam, string? TenCam, string? DangEpVien, string? KichCoEpVien,
    double? BatchSize, string? VatNuoi);

// Auto-scan DTOs
public record ImportStockScanRequest(string Date, string? Source, List<ImportStockScanItem> Items);
public record ImportStockScanItem(string CodeCam, string? TenCam, double SoLuong, string? PackSize,
    double? BalanceBag, double? DayOnHand, double? AvgSalePerDay, string? Category);

// Bulk sync DTOs
public record ImportPackingBulkRequest(List<ImportPackingBulkItem> Items);
public record ImportPackingBulkItem(string NgayDongBao, int IdSanPham, double SoLuongTan,
    double KichCoBaoKg, int? SoBao, string? LineDongBao, string? GhiChu);

