using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("tbsys_chuc_nang_theo_vai_tro")]
public class RoleFunction : BaseEntity
{
    [Required]
    [Column("id_vai_tro")]
    public int IdVaiTro { get; set; }

    [Required]
    [Column("id_danh_sach_chuc_nang")]
    public int IdDanhSachChucNang { get; set; }

    // Navigation
    [ForeignKey("IdVaiTro")]
    public Role? VaiTro { get; set; }

    [ForeignKey("IdDanhSachChucNang")]
    public SubFunction? DanhSachChucNang { get; set; }
}
