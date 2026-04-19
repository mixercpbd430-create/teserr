using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

public abstract class BaseEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("nguoi_tao")]
    public string? NguoiTao { get; set; }

    [Column("thoi_gian_tao")]
    public DateTime? ThoiGianTao { get; set; } = DateTime.UtcNow;

    [Column("nguoi_sua")]
    public string? NguoiSua { get; set; }

    [Column("thoi_gian_sua")]
    public DateTime? ThoiGianSua { get; set; }

    [Column("da_xoa")]
    public bool DaXoa { get; set; } = false;
}
