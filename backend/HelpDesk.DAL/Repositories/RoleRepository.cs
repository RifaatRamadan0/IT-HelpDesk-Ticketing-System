using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly AppDbContext _context;

        public RoleRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ICollection<Role>> GetAllAsync()
        {
            return await _context.Roles
                .AsNoTracking()
                .OrderBy(r => r.Id)
                .ToListAsync();
        }
    }
}
