using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("tbsys_danh_sach_chuc_nang")]
public class SubFunction : BaseEntity
{
    [Required]
    [Column("id_chuc_nang_chinh")]
    public int IdChucNangChinh { get; set; }

    [Required]
    [Column("chuc_nang_con")]
    public string ChucNangCon { get; set; } = string.Empty;

    [Column("router")]
    public string? Router { get; set; }

    [Column("icon")]
    public string? Icon { get; set; }

    [Column("thu_tu_uu_tien")]
    public int ThuTuUuTien { get; set; }

    // Navigation
    [ForeignKey("IdChucNangChinh")]
    public MainFunction? ChucNangChinh { get; set; }
}
