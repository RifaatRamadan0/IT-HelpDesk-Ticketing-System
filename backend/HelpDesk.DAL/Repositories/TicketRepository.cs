using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Repositories
{
    public class TicketRepository : ITicketRepository
    {
        private readonly AppDbContext _context;

        public TicketRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CreateAsync(Ticket ticket)
        {
            await _context.Tickets.AddAsync(ticket);
            await _context.SaveChangesAsync();
            return ticket.Id;
        }

        public async Task<bool> DeleteAsync(int ticketId)
        {
            Ticket? ticket = await _context.Tickets.FindAsync(ticketId);

            if (ticket == null)
                return false;

            _context.Tickets.Remove(ticket);

            return (await _context.SaveChangesAsync()) > 0;
        }

        public async Task<ICollection<Ticket>> GetAllAsync()
        {
            return await _context.Tickets
                .Include(t => t.CreatedByUser).ThenInclude(u => u.Role)
                .Include(t => t.AssignedByUser).ThenInclude(u => u!.Role)
                .Include(t => t.AssignedToUser).ThenInclude(u => u!.Role)
                .Include(t => t.Category)
                .Include(t => t.Priority)
                .Include(t => t.Status)
                .ToListAsync();
        }

        public async Task<ICollection<Ticket>> GetByAssignedUserIdAsync(int userId)
        {
            return await _context.Tickets
                .Where(t => t.AssignedToUserId == userId)
                .Include(t => t.CreatedByUser).ThenInclude(u => u.Role)
                .Include(t => t.AssignedByUser).ThenInclude(u => u!.Role)
                .Include(t => t.AssignedToUser).ThenInclude(u => u!.Role)
                .Include(t => t.Category)
                .Include(t => t.Priority)
                .Include(t => t.Status)
                .ToListAsync();
        }

        public async Task<ICollection<Ticket>> GetByCreatedUserIdAsync(int userId)
        {
            return await _context.Tickets
                .Where(t => t.CreatedByUserId == userId)
                .Include(t => t.CreatedByUser).ThenInclude(u => u.Role)
                .Include(t => t.AssignedByUser).ThenInclude(u => u!.Role)
                .Include(t => t.AssignedToUser).ThenInclude(u => u!.Role)
                .Include(t => t.Category)
                .Include(t => t.Priority)
                .Include(t => t.Status)
                .ToListAsync();
        }

        public async Task<Ticket?> GetByIdAsync(int ticketId)
        {
            return await _context.Tickets
                .Include(t => t.CreatedByUser).ThenInclude(u => u.Role)
                .Include(t => t.AssignedByUser).ThenInclude(u => u!.Role)
                .Include(t => t.AssignedToUser).ThenInclude(u => u!.Role)
                .Include(t => t.Category)
                .Include(t => t.Priority)
                .Include(t => t.Status)
                .SingleOrDefaultAsync(t => t.Id == ticketId);
        }

        public async Task<bool> UpdateAsync(Ticket ticket)
        {
            _context.Tickets.Update(ticket);

            return (await _context.SaveChangesAsync()) > 0;
        }

        public async Task<TicketStatistics> GetStatisticsAsync(Expression<Func<Ticket, bool>>? filter = null)
        {
            IQueryable<Ticket> query = _context.Tickets;
            if (filter != null)
                query = query.Where(filter);

            var countByStatus = await query
                .GroupBy(t => t.StatusId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var countByPriority = await query
                .GroupBy(t => t.Priority.PriorityName)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var countByCategory = await query
                .GroupBy(t => t.Category.CategoryName)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            int criticalOpen = await query.CountAsync(t =>
                t.Priority.PriorityName == "Critical" &&
                t.StatusId != (int)TicketStatus.Resolved &&
                t.StatusId != (int)TicketStatus.Closed);

            double? avgResolutionHours = await query
                .Where(t => t.ResolvedDate != null)
                .Select(t => (double?)EF.Functions.DateDiffSecond(t.CreatedDate, t.ResolvedDate!.Value) / 3600.0)
                .AverageAsync();

            return new TicketStatistics
            {
                CountByStatus = countByStatus,
                CountByPriority = countByPriority,
                CountByCategory = countByCategory,
                CriticalOpen = criticalOpen,
                AvgResolutionHours = avgResolutionHours
            };
        }
    }
}
