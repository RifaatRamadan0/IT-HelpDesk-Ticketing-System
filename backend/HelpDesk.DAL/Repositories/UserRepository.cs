using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<ICollection<User>> GetAllAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .OrderBy(u => u.Id)
                .ToListAsync();
        }

        public async Task<ICollection<User>> GetActiveAgentsAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .Where(u => u.IsActive && u.Role.RoleName == "Agent")
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ToListAsync();
        }

        public async Task<ICollection<User>> GetManagersAndAdminsAsync()
        {
            return await _context.Users
                .Include(u => u.Role)
                .Where(u => u.IsActive && (u.Role.RoleName == "Manager" || u.Role.RoleName == "Admin"))
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ToListAsync();
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email == email);
        }

        public async Task<bool> HasTicketsAsync(int userId)
        {
            return await _context.Tickets.AnyAsync(t =>
                t.CreatedByUserId == userId ||
                t.AssignedToUserId == userId ||
                t.AssignedByUserId == userId);
        }

        public async Task<int> CreateAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            return user.Id;
        }

        public async Task<bool> UpdateAsync(User user)
        {
            _context.Users.Update(user);
            return (await _context.SaveChangesAsync()) > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return false;

            _context.Users.Remove(user);
            return (await _context.SaveChangesAsync()) > 0;
        }
    }
}
