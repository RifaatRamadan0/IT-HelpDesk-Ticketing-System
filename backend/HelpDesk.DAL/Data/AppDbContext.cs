using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.DAL.Data
{
    public class AppDbContext : DbContext   
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Read every DateTime back as UTC so it serializes with a 'Z' marker and
        // clients don't mistake the stored UTC instant for local time.
        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<DateTime>()
                .HaveConversion<UtcDateTimeConverter>();
            configurationBuilder.Properties<DateTime?>()
                .HaveConversion<UtcNullableDateTimeConverter>();
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Ticket> Tickets => Set<Ticket>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Priority> Priorities => Set<Priority>();
        public DbSet<Status> Statuses => Set<Status>();
        public DbSet<TicketComment> TicketComments => Set<TicketComment>();
        public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
        public DbSet<Attachment> Attachments => Set<Attachment>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Seed roles
            modelBuilder.Entity<Role>().HasData(
                new Role { Id = 1, RoleName = "Admin" },
                new Role { Id = 2, RoleName = "Agent" },
                new Role { Id = 3, RoleName = "Employee" },
                new Role { Id = 4, RoleName = "Manager" }
            );

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.CreatedByUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.AssignedByUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.AssignedToUser)
                .WithMany()
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Ticket>()
                .Property(t => t.Title)
                .HasMaxLength(200);

            modelBuilder.Entity<TicketComment>()
                .HasOne(c => c.Ticket)
                .WithMany()
                .HasForeignKey(c => c.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TicketComment>()
                .HasOne(c => c.CreatedByUser)
                .WithMany()
                .HasForeignKey(c => c.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TicketComment>()
                .Property(c => c.Body)
                .HasMaxLength(2000);


            modelBuilder.Entity<ActivityLog>()
                .HasOne(a => a.Ticket)
                .WithMany()
                .HasForeignKey(a => a.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ActivityLog>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ActivityLog>()
                .HasOne(a => a.OldStatus)
                .WithMany()
                .HasForeignKey(a => a.OldStatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ActivityLog>()
                .HasOne(a => a.NewStatus)
                .WithMany()
                .HasForeignKey(a => a.NewStatusId)
                .OnDelete(DeleteBehavior.Restrict);

            // Persist the action kind as its string name (human-readable column).
            modelBuilder.Entity<ActivityLog>()
                .Property(a => a.ActionType)
                .HasConversion<string>()
                .HasMaxLength(40);

            modelBuilder.Entity<ActivityLog>()
                .Property(a => a.ActionText)
                .HasMaxLength(256);



            modelBuilder.Entity<Attachment>()
                .HasOne(a => a.Ticket)
                .WithMany()
                .HasForeignKey(a => a.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Attachment>()
                .HasOne(a => a.UploadedByUser)
                .WithMany()
                .HasForeignKey(a => a.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Attachment>()
                .Property(a => a.FilePath)
                .HasMaxLength(500);

            modelBuilder.Entity<Attachment>()
                .Property(a => a.FileName)
                .HasMaxLength(255);

            modelBuilder.Entity<Attachment>()
                .Property(a => a.ContentType)
                .HasMaxLength(100);

            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, CategoryName = "Hardware" },
                new Category { Id = 2, CategoryName = "Software" },
                new Category { Id = 3, CategoryName = "Network" },
                new Category { Id = 4, CategoryName = "Email" },
                new Category { Id = 5, CategoryName = "Access Request" },
                new Category { Id = 6, CategoryName = "Other" }
            );

            modelBuilder.Entity<Priority>().HasData(
                new Priority { Id = 1, PriorityName = "Low" },
                new Priority { Id = 2, PriorityName = "Medium" },
                new Priority { Id = 3, PriorityName = "High" },
                new Priority { Id = 4, PriorityName = "Critical" }
            );

            modelBuilder.Entity<Status>().HasData(
                new Status { Id = 1, StatusName = "Open" },
                new Status { Id = 2, StatusName = "In Progress" },
                new Status { Id = 3, StatusName = "Pending" },
                new Status { Id = 4, StatusName = "Resolved" },
                new Status { Id = 5, StatusName = "Closed" }
            );
        }
    }
}
