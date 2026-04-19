using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("tbsys_users")]
public class User : BaseEntity
{
    [Required]
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Column("password")]
    public string? Password { get; set; }

    [Column("fullname")]
    public string? Fullname { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("so_dien_thoai")]
    public string? SoDienThoai { get; set; }

    [Column("ngay_sinh")]
    public DateTime? NgaySinh { get; set; }

    [Column("gioi_tinh")]
    public string? GioiTinh { get; set; }

    [Column("id_vai_tro")]
    public int? IdVaiTro { get; set; }

    [Column("dia_chi")]
    public string? DiaChi { get; set; }

    [Column("hinh_anh")]
    public string? HinhAnh { get; set; }

    [Column("is_lock")]
    public bool IsLock { get; set; } = false;

    // Navigation
    [ForeignKey("IdVaiTro")]
    public Role? VaiTro { get; set; }
}
