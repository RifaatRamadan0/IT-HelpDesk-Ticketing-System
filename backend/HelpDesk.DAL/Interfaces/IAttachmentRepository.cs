using HelpDesk.Domain.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface IAttachmentRepository
    {
        Task<int> CreateAsync(Attachment attachment);
        Task<Attachment?> GetByIdAsync(int id);
        Task<ICollection<Attachment>> GetByTicketIdAsync(int ticketId);
        Task DeleteAsync(Attachment attachment);
    }
}
