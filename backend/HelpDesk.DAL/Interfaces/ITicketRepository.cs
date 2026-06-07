using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface ITicketRepository
    {
        Task<int> CreateAsync(Ticket ticket);
        Task<bool> UpdateAsync(Ticket ticket);
        Task<bool> DeleteAsync(int ticketId);
        Task<Ticket?> GetByIdAsync(int ticketId);
        Task<ICollection<Ticket>> GetByCreatedUserIdAsync(int userId);
        Task<ICollection<Ticket>> GetByAssignedUserIdAsync(int userId);
        Task<ICollection<Ticket>> GetAllAsync();
    }
}
