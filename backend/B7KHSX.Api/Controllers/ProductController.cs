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
public class ProductController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductController(AppDbContext db) { _db = db; }

    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "system";

    private static ProductDto ToDto(Product p) => new(
        p.Id, p.CodeCam, p.TenCam, p.DangEpVien, p.KichCoEpVien,
        p.KichCoDongBao, p.BatchSize, p.VatNuoi, p.Pellet, p.Packing);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _db.Products.AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => (p.TenCam != null && p.TenCam.Contains(search)) ||
                                     (p.CodeCam != null && p.CodeCam.Contains(search)));

        var total = await query.CountAsync();
        var items = await query.OrderBy(p => p.CodeCam)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => ToDto(p)).ToListAsync();

        return Ok(new PagedResult<ProductDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await _db.Products.FindAsync(id);
        return p == null ? NotFound() : Ok(ToDto(p));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
    {
        var product = new Product
        {
            CodeCam = dto.CodeCam, TenCam = dto.TenCam, DangEpVien = dto.DangEpVien,
            KichCoEpVien = dto.KichCoEpVien, KichCoDongBao = dto.KichCoDongBao,
            BatchSize = dto.BatchSize, VatNuoi = dto.VatNuoi,
            Pellet = dto.Pellet, Packing = dto.Packing,
            NguoiTao = GetUsername(), ThoiGianTao = DateTime.UtcNow
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ToDto(product));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProductCreateDto dto)
    {
        var p = await _db.Products.FindAsync(id);
        if (p == null) return NotFound();
        p.CodeCam = dto.CodeCam; p.TenCam = dto.TenCam; p.DangEpVien = dto.DangEpVien;
        p.KichCoEpVien = dto.KichCoEpVien; p.KichCoDongBao = dto.KichCoDongBao;
        p.BatchSize = dto.BatchSize; p.VatNuoi = dto.VatNuoi;
        p.Pellet = dto.Pellet; p.Packing = dto.Packing;
        p.NguoiSua = GetUsername(); p.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(p));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await _db.Products.FindAsync(id);
        if (p == null) return NotFound();
        p.DaXoa = true; p.NguoiSua = GetUsername(); p.ThoiGianSua = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Đã xóa sản phẩm"));
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetList()
    {
        var items = await _db.Products.OrderBy(p => p.CodeCam)
            .Select(p => new { p.Id, p.CodeCam, p.TenCam, p.DangEpVien, p.KichCoEpVien, p.BatchSize })
            .ToListAsync();
        return Ok(items);
    }
}
