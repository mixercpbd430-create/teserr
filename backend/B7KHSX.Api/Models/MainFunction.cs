using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("tbsys_chuc_nang_chinh")]
public class MainFunction : BaseEntity
{
    [Required]
    [Column("chuc_nang_chinh")]
    public string ChucNangChinh { get; set; } = string.Empty;

    [Column("router")]
    public string? Router { get; set; }

    [Column("thu_tu_uu_tien")]
    public int? ThuTuUuTien { get; set; }

    [Column("icon")]
    public string? Icon { get; set; }
}
