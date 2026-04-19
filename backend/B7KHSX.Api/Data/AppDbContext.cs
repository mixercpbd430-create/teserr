using Microsoft.EntityFrameworkCore;
using B7KHSX.Api.Models;

namespace B7KHSX.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // System tables
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<MainFunction> MainFunctions => Set<MainFunction>();
    public DbSet<SubFunction> SubFunctions => Set<SubFunction>();
    public DbSet<RoleFunction> RoleFunctions => Set<RoleFunction>();
    public DbSet<AppConfig> AppConfigs => Set<AppConfig>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Business tables
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<PelletRecord> PelletRecords => Set<PelletRecord>();
    public DbSet<StockToday> StockTodays => Set<StockToday>();
    public DbSet<PackingPlan> PackingPlans => Set<PackingPlan>();
    public DbSet<BaoBi> BaoBis => Set<BaoBi>();
    public DbSet<Unit> Units => Set<Unit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global query filter for soft delete
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<Role>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<MainFunction>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<SubFunction>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<RoleFunction>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<Product>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<Plan>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<Order>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<PelletRecord>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<StockToday>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<PackingPlan>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<BaoBi>().HasQueryFilter(e => !e.DaXoa);
        modelBuilder.Entity<Unit>().HasQueryFilter(e => !e.DaXoa);

        // Unique constraints
        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
        modelBuilder.Entity<AppConfig>().HasKey(c => c.ConfigKey);

        // Seed roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, VaiTro = "Admin", ThuTuUuTien = 1, NguoiTao = "system", ThoiGianTao = DateTime.UtcNow },
            new Role { Id = 2, VaiTro = "Nhân viên", ThuTuUuTien = 2, NguoiTao = "system", ThoiGianTao = DateTime.UtcNow },
            new Role { Id = 3, VaiTro = "Quản lý", ThuTuUuTien = 3, NguoiTao = "system", ThoiGianTao = DateTime.UtcNow }
        );

        // Seed admin user (password: nho123)
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Username = "phinho",
                Password = BCrypt.Net.BCrypt.HashPassword("nho123"),
                Fullname = "Phi Nho",
                IdVaiTro = 1,
                IsLock = false,
                NguoiTao = "system",
                ThoiGianTao = DateTime.UtcNow
            }
        );

        // Seed config
        modelBuilder.Entity<AppConfig>().HasData(
            new AppConfig { ConfigKey = "project_name", ConfigValue = "Kế Hoạch Sản Xuất" },
            new AppConfig { ConfigKey = "style_container_bg", ConfigValue = "#2E3440" },
            new AppConfig { ConfigKey = "style_icon_color", ConfigValue = "#88C0D0" },
            new AppConfig { ConfigKey = "style_nav_link_selected_bg", ConfigValue = "#81A1C1" }
        );
    }
}
