using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.DAL.Results;
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

        public async Task<TicketReportStatistics> GetReportStatisticsAsync(DateTime from, DateTime to)
        {
            IQueryable<Ticket> created = _context.Tickets
                .Where(t => t.CreatedDate >= from && t.CreatedDate < to);
            IQueryable<Ticket> resolved = _context.Tickets
                .Where(t => t.ResolvedDate != null && t.ResolvedDate >= from && t.ResolvedDate < to);

            int createdCount = await created.CountAsync();
            int resolvedCount = await resolved.CountAsync();
            int escalatedCount = await created.CountAsync(t => t.IsEscalated);
            long totalTimeSpentSeconds = await resolved.SumAsync(t => (long)t.TimeSpentSeconds);

            var createdByCategory = await created
                .GroupBy(t => t.Category.CategoryName)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var createdByPriority = await created
                .GroupBy(t => t.Priority.PriorityName)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var createdByDay = await created
                .GroupBy(t => t.CreatedDate.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Day, x => x.Count);

            var resolvedByDay = await resolved
                .GroupBy(t => t.ResolvedDate!.Value.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Day, x => x.Count);

            double? avgResolutionHours = await resolved
                .Select(t => (double?)EF.Functions.DateDiffSecond(t.CreatedDate, t.ResolvedDate!.Value) / 3600.0)
                .AverageAsync();

            var byAgent = await resolved
                .Where(t => t.AssignedToUserId != null)
                .GroupBy(t => new { t.AssignedToUserId, t.AssignedToUser!.FirstName, t.AssignedToUser.LastName })
                .Select(g => new AgentReportRow
                {
                    UserId = g.Key.AssignedToUserId!.Value,
                    Name = g.Key.FirstName + " " + g.Key.LastName,
                    Resolved = g.Count(),
                    TimeSpentSeconds = g.Sum(t => (long)t.TimeSpentSeconds),
                    AvgResolutionHours = g.Average(t =>
                        (double?)EF.Functions.DateDiffSecond(t.CreatedDate, t.ResolvedDate!.Value) / 3600.0)
                })
                .ToListAsync();

            return new TicketReportStatistics
            {
                Created = createdCount,
                Resolved = resolvedCount,
                Escalated = escalatedCount,
                TotalTimeSpentSeconds = totalTimeSpentSeconds,
                AvgResolutionHours = avgResolutionHours,
                CreatedByCategory = createdByCategory,
                CreatedByPriority = createdByPriority,
                CreatedByDay = createdByDay,
                ResolvedByDay = resolvedByDay,
                ByAgent = byAgent
            };
        }
    }
}
