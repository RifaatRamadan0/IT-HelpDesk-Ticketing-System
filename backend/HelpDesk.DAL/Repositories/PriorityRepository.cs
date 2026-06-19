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
    public class PriorityRepository : IPriorityRepository
    {
        private readonly AppDbContext _context;

        public PriorityRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ICollection<Priority>> GetAllAsync()
        {
            // Read-only lookup data; AsNoTracking skips the change tracker since
            // these rows are never mutated through this path.
            return await _context.Priorities
                .AsNoTracking()
                .OrderBy(p => p.Id)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.Priorities.AnyAsync(p => p.Id == id);
        }
    }
}
