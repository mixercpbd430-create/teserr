namespace B7KHSX.Api.DTOs;

// Auth
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string Fullname, string Role, int RoleId);

// Menu
public record MenuGroupDto(int Id, string Name, string? Icon, int Order, List<MenuItemDto> Items);
public record MenuItemDto(int Id, string Name, string? Icon, string? Router, int Order);

// Product
public record ProductDto(int Id, string? CodeCam, string? TenCam, string? DangEpVien, string? KichCoEpVien,
    double? KichCoDongBao, double? BatchSize, string? VatNuoi, string? Pellet, string? Packing);
public record ProductCreateDto(string? CodeCam, string? TenCam, string? DangEpVien, string? KichCoEpVien,
    double? KichCoDongBao, double? BatchSize, string? VatNuoi, string? Pellet, string? Packing);

// Plan
public record PlanDto(int Id, int? IdSanPham, string? MaPlan, double SoLuong, string? NgayPlan,
    string? GhiChu, string? NguoiTao, DateTime? ThoiGianTao, ProductDto? SanPham);
public record PlanCreateDto(int IdSanPham, double SoLuong, string? NgayPlan, string? GhiChu);
public record PlanBatchCreateDto(string? NgayPlan, List<PlanItemDto> Items);
public record PlanItemDto(int IdSanPham, double SoLuong, string? GhiChu);

// Order
public record OrderDto(int Id, int? IdSanPham, string? MaDatHang, double SoLuong, string? NgayDat,
    string? NgayLay, string? LoaiDatHang, int KhachVangLai, string? GhiChu,
    string? NguoiTao, DateTime? ThoiGianTao, ProductDto? SanPham);
public record OrderCreateDto(int IdSanPham, double SoLuong, string? NgayLay, string? GhiChu,
    string LoaiDatHang, int KhachVangLai = 0);

// Stock
public record StockDto(int Id, int? IdSanPham, double SoLuong, string? NgayCapNhat,
    string? GhiChu, ProductDto? SanPham);

// Pellet
public record PelletDto(int Id, DateTime NgaySanXuat, int? IdSanPham, double SoLuong,
    string SoMay, DateTime? ThoiGianBatDau, DateTime? ThoiGianKetThuc,
    double? ThoiGianChayGio, double? CongSuatMay, string? GhiChu, ProductDto? SanPham);

// Dashboard summary
public record DashboardDto(int TotalProducts, int TotalPlansToday, double TotalProductionToday,
    int TotalOrders, double TotalStock);

// Pagination
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

// Generic
public record ApiResponse(bool Success, string Message);
