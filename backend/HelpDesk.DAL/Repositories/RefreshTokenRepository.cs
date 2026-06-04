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
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly AppDbContext _context;

        public RefreshTokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(RefreshToken token)
        {
            await _context.RefreshTokens.AddAsync(token);
            await _context.SaveChangesAsync();
        }

        public async Task<RefreshToken?> GetByTokenAsync(string token)
        {
            return await _context.RefreshTokens
                .Include(t => t.User)
                .ThenInclude(u => u.Role)
                .SingleOrDefaultAsync(t => t.Token == token);
        }

        public async Task RevokeAllByUserIdAsync(int userId)
        {
            await _context.RefreshTokens
                .Where(t => t.UserId == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsRevoked, true));
        }
    }
}
