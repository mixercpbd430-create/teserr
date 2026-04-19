using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace B7KHSX.Api.Models;

[Table("san_pham")]
public class Product : BaseEntity
{
    [Column("code_cam")]
    public string? CodeCam { get; set; }

    [Column("ten_cam")]
    public string? TenCam { get; set; }

    [Column("dang_ep_vien")]
    public string? DangEpVien { get; set; }

    [Column("kich_co_ep_vien")]
    public string? KichCoEpVien { get; set; }

    [Column("kich_co_dong_bao")]
    public double? KichCoDongBao { get; set; }

    [Column("batch_size")]
    public double? BatchSize { get; set; }

    [Column("vat_nuoi")]
    public string? VatNuoi { get; set; }

    [Column("pellet")]
    public string? Pellet { get; set; }

    [Column("packing")]
    public string? Packing { get; set; }

    [Column("thong_so_khuon")]
    public string? ThongSoKhuon { get; set; }
}

[Table("plan")]
public class Plan : BaseEntity
{
    [Column("id_san_pham")]
    public int? IdSanPham { get; set; }

    [Column("ma_plan")]
    public string? MaPlan { get; set; }

    [Column("so_luong")]
    public double SoLuong { get; set; }

    [Column("ngay_plan")]
    public string? NgayPlan { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation
    [ForeignKey("IdSanPham")]
    public Product? SanPham { get; set; }
}

[Table("dat_hang")]
public class Order : BaseEntity
{
    [Column("id_san_pham")]
    public int? IdSanPham { get; set; }

    [Column("ma_dat_hang")]
    public string? MaDatHang { get; set; }

    [Column("so_luong")]
    public double SoLuong { get; set; }

    [Column("ngay_dat")]
    public string? NgayDat { get; set; }

    [Column("ngay_lay")]
    public string? NgayLay { get; set; }

    [Column("loai_dat_hang")]
    public string? LoaiDatHang { get; set; }

    [Column("khach_vang_lai")]
    public int KhachVangLai { get; set; } = 0;

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation
    [ForeignKey("IdSanPham")]
    public Product? SanPham { get; set; }
}

[Table("pellet")]
public class PelletRecord : BaseEntity
{
    [Column("ngay_san_xuat")]
    public DateTime NgaySanXuat { get; set; }

    [Column("id_ke_hoach")]
    public int? IdKeHoach { get; set; }

    [Column("id_san_pham")]
    public int? IdSanPham { get; set; }

    [Column("so_luong")]
    public double SoLuong { get; set; }

    [Column("so_may")]
    public string SoMay { get; set; } = string.Empty;

    [Column("thoi_gian_bat_dau")]
    public DateTime? ThoiGianBatDau { get; set; }

    [Column("thoi_gian_ket_thuc")]
    public DateTime? ThoiGianKetThuc { get; set; }

    [Column("thoi_gian_chay_gio")]
    public double? ThoiGianChayGio { get; set; }

    [Column("cong_suat_may")]
    public double? CongSuatMay { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation
    [ForeignKey("IdSanPham")]
    public Product? SanPham { get; set; }
}

[Table("stock_hom_nay")]
public class StockToday : BaseEntity
{
    [Column("id_san_pham")]
    public int? IdSanPham { get; set; }

    [Column("so_luong")]
    public double SoLuong { get; set; }

    [Column("ngay_cap_nhat")]
    public string? NgayCapNhat { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation
    [ForeignKey("IdSanPham")]
    public Product? SanPham { get; set; }
}

[Table("don_vi_tinh")]
public class Unit : BaseEntity
{
    [Column("ma_don_vi")]
    public string MaDonVi { get; set; } = string.Empty;

    [Column("ten_don_vi")]
    public string TenDonVi { get; set; } = string.Empty;
}

[Table("packing_plan")]
public class PackingPlan : BaseEntity
{
    [Column("ngay_dong_bao")]
    public DateTime NgayDongBao { get; set; }

    [Column("id_pellet")]
    public int? IdPellet { get; set; }

    [Column("id_san_pham")]
    public int? IdSanPham { get; set; }

    [Column("so_luong_tan")]
    public double SoLuongTan { get; set; }

    [Column("kich_co_bao_kg")]
    public double KichCoBaoKg { get; set; }

    [Column("so_bao")]
    public int? SoBao { get; set; }

    [Column("line_dong_bao")]
    public string LineDongBao { get; set; } = string.Empty;

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }

    // Navigation
    [ForeignKey("IdSanPham")]
    public Product? SanPham { get; set; }
}

[Table("bao_bi")]
public class BaoBi : BaseEntity
{
    [Column("ngay_kiem_tra")]
    public DateTime NgayKiemTra { get; set; }

    [Column("loai_bao")]
    public string LoaiBao { get; set; } = string.Empty;

    [Column("kich_co_kg")]
    public double KichCoKg { get; set; }

    [Column("ton_kho_hien_tai")]
    public int TonKhoHienTai { get; set; }

    [Column("nhu_cau_du_kien")]
    public int? NhuCauDuKien { get; set; }

    [Column("muc_canh_bao")]
    public string? MucCanhBao { get; set; }

    [Column("so_luong_thieu")]
    public int? SoLuongThieu { get; set; }

    [Column("ghi_chu")]
    public string? GhiChu { get; set; }
}

[Table("tbsys_config")]
public class AppConfig
{
    [Key]
    [Column("config_key")]
    public string ConfigKey { get; set; } = string.Empty;

    [Column("config_value")]
    public string? ConfigValue { get; set; }
}

[Table("tbsys_logs")]
public class AuditLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Column("username")]
    public string? Username { get; set; }

    [Column("action")]
    public string? Action { get; set; }

    [Column("table_name")]
    public string? TableName { get; set; }

    [Column("details")]
    public string? Details { get; set; }

    [Column("status")]
    public string? Status { get; set; }
}
