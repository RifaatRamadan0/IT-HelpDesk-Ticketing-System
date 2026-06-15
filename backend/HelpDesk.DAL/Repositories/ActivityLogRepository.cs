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
    public class ActivityLogRepository : IActivityLogRepository
    {
        private readonly AppDbContext _context;

        public ActivityLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CreateAsync(ActivityLog log)
        {
            await _context.ActivityLogs.AddAsync(log);
            await _context.SaveChangesAsync();
            return log.Id;
        }

        // Oldest first so the timeline reads top-to-bottom. The actor (with role)
        // and the old/new status rows are eagerly loaded for the response DTO.
        public async Task<ICollection<ActivityLog>> GetByTicketIdAsync(int ticketId)
        {
            return await _context.ActivityLogs
                .Include(a => a.User).ThenInclude(u => u.Role)
                .Include(a => a.OldStatus)
                .Include(a => a.NewStatus)
                .Where(a => a.TicketId == ticketId)
                .OrderBy(a => a.CreatedDate)
                .ToListAsync();
        }
    }
}
