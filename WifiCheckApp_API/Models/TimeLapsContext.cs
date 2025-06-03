using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace WifiCheckApp_API.Models;

public partial class TimeLapsContext : DbContext
{
    public TimeLapsContext()
    {
    }

    public TimeLapsContext(DbContextOptions<TimeLapsContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Attendance> Attendances { get; set; }

    public virtual DbSet<AttendanceHistory> AttendanceHistories { get; set; }

    public virtual DbSet<AttendanceSession> AttendanceSessions { get; set; }

    public virtual DbSet<Device> Devices { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<GpsLocation> GpsLocations { get; set; }

    public virtual DbSet<LeaveType> LeaveTypes { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<WiFiBssid> WiFiBssids { get; set; }

    public virtual DbSet<WiFiLocation> WiFiLocations { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=127.0.0.1,1433;Initial Catalog=TIMELAPS;Persist Security Info=False;User ID=admin;Password=admin123;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=30;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PK__Attendan__8B69263C18D3A907");

            entity.Property(e => e.AttendanceId).HasColumnName("AttendanceID");
            entity.Property(e => e.CheckInStatus).HasMaxLength(50);
            entity.Property(e => e.CheckInTime).HasColumnType("datetime");
            entity.Property(e => e.CheckOutStatus).HasMaxLength(50);
            entity.Property(e => e.CheckOutTime).HasColumnType("datetime");
            entity.Property(e => e.EmployeeId).HasColumnName("EmployeeID");
            entity.Property(e => e.LeaveType).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(50);

            entity.HasOne(d => d.Employee).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Attendances_Employees");

            entity.HasOne(d => d.Gps).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.GpsId)
                .HasConstraintName("FK_Attendance_Gps");

            entity.HasOne(d => d.Session).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("FK_Attendance_Session");

            entity.HasOne(d => d.WiFi).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.WiFiId)
                .HasConstraintName("FK_Attendance_WiFi");
        });

        modelBuilder.Entity<AttendanceHistory>(entity =>
        {
            entity.HasKey(e => e.HistoryId).HasName("PK__Attendan__4D7B4ADDB7889D1F");

            entity.ToTable("AttendanceHistory");

            entity.Property(e => e.HistoryId).HasColumnName("HistoryID");
            entity.Property(e => e.ActionType).HasMaxLength(50);
            entity.Property(e => e.AttendanceId).HasColumnName("AttendanceID");
            entity.Property(e => e.PerformedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Attendance).WithMany(p => p.AttendanceHistories)
                .HasForeignKey(d => d.AttendanceId)
                .HasConstraintName("FK__Attendanc__Atten__151B244E");

            entity.HasOne(d => d.PerformedByNavigation).WithMany(p => p.AttendanceHistories)
                .HasForeignKey(d => d.PerformedBy)
                .HasConstraintName("FK__Attendanc__Perfo__160F4887");
        });

        modelBuilder.Entity<AttendanceSession>(entity =>
        {
            entity.HasKey(e => e.SessionId).HasName("PK__Attendan__C9F4929090DAB012");

            entity.ToTable("AttendanceSession");

            entity.Property(e => e.Name).HasMaxLength(20);
        });

        modelBuilder.Entity<Device>(entity =>
        {
            entity.HasKey(e => e.DeviceId).HasName("PK__Devices__49E12331902B55E5");

            entity.HasIndex(e => e.MacAddress, "UQ__Devices__50EDF1CDE03D36C3").IsUnique();

            entity.Property(e => e.DeviceId).HasColumnName("DeviceID");
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MacAddress)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId).HasName("PK__Employee__7AD04FF18D94ADF5");

            entity.Property(e => e.EmployeeId).HasColumnName("EmployeeID");
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.Gender).HasMaxLength(10);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Position).HasMaxLength(100);
        });

        modelBuilder.Entity<GpsLocation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Location__3214EC07ED62AC45");

            entity.ToTable("GpsLocation");

            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.RadiusInMeters).HasDefaultValue(100.0);
        });

        modelBuilder.Entity<LeaveType>(entity =>
        {
            entity.HasKey(e => e.LeaveTypeId).HasName("PK__LeaveTyp__43BE8FF4DB3CD53D");

            entity.Property(e => e.LeaveTypeId).HasColumnName("LeaveTypeID");
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.LeaveTypeName).HasMaxLength(100);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE3A196FD1AF");

            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.RoleName).HasMaxLength(50);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCAC7653795E");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E4F97CFD66").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.EmployeeId).HasColumnName("EmployeeID");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Password).HasMaxLength(255);
            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.Username).HasMaxLength(50);

            entity.HasOne(d => d.Employee).WithMany(p => p.Users)
                .HasForeignKey(d => d.EmployeeId)
                .HasConstraintName("FK__Users__EmployeeI__0F624AF8");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__Users__RoleID__10566F31");
        });

        modelBuilder.Entity<WiFiBssid>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__WiFiBSSI__3214EC072B439109");

            entity.ToTable("WiFiBSSID");

            entity.Property(e => e.Bssid)
                .HasMaxLength(100)
                .HasColumnName("BSSID");

            entity.HasOne(d => d.WiFi).WithMany(p => p.WiFiBssids)
                .HasForeignKey(d => d.WiFiId)
                .HasConstraintName("FK__WiFiBSSID__WiFiI__3493CFA7");
        });

        modelBuilder.Entity<WiFiLocation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Wifi__3214EC07E0FA9EAA");

            entity.ToTable("WiFiLocation");

            entity.Property(e => e.Ssid)
                .HasMaxLength(100)
                .HasColumnName("SSID");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
