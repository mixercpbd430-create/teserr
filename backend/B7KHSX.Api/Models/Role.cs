using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("tbsys_vai_tro")]
public class Role : BaseEntity
{
    [Required]
    [Column("vai_tro")]
    public string VaiTro { get; set; } = string.Empty;

    [Column("thu_tu_uu_tien")]
    public int? ThuTuUuTien { get; set; }
}
