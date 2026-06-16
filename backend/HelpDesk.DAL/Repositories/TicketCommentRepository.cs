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
    public class TicketCommentRepository : ITicketCommentRepository
    {
        private readonly AppDbContext _context;

        public TicketCommentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CreateAsync(TicketComment comment)
        {
            await _context.TicketComments.AddAsync(comment);
            await _context.SaveChangesAsync();
            return comment.Id;
        }

        public async Task<ICollection<TicketComment>> GetByTicketIdAsync(int ticketId, bool includeInternal)
        {
            return await _context.TicketComments
                .Include(c => c.CreatedByUser).ThenInclude(u => u.Role)
                .Where(c => c.TicketId == ticketId)
                .Where(c => includeInternal || !c.IsInternal)
                .OrderBy(c => c.CreatedDate)
                .ToListAsync();
        }
    }
}
