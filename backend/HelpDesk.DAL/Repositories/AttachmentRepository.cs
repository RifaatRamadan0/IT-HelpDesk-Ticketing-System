using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Repositories
{
    public class AttachmentRepository : IAttachmentRepository
    {
        private readonly AppDbContext _context;

        public AttachmentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CreateAsync(Attachment attachment)
        {
            await _context.Attachments.AddAsync(attachment);
            await _context.SaveChangesAsync();
            return attachment.Id;
        }

        public async Task<Attachment?> GetByIdAsync(int id)
        {
            return await _context.Attachments
                .Include(a => a.UploadedByUser).ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<ICollection<Attachment>> GetByTicketIdAsync(int ticketId)
        {
            return await _context.Attachments
                .Include(a => a.UploadedByUser).ThenInclude(u => u.Role)
                .Where(a => a.TicketId == ticketId)
                .OrderBy(a => a.UploadedDate)
                .ToListAsync();
        }

        public async Task DeleteAsync(Attachment attachment)
        {
            _context.Attachments.Remove(attachment);
            await _context.SaveChangesAsync();
        }
    }
}
