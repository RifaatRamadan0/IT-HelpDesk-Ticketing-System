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

        public DbSet<User> Users => Set<User>();
        public DbSet<Role> Roles => Set<Role>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Ticket> Tickets => Set<Ticket>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<Priority> Priorities => Set<Priority>();
        public DbSet<Status> Statuses => Set<Status>();

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
