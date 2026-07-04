using HelpDesk.DAL.Results;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
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
        Task<TicketStatistics> GetStatisticsAsync(Expression<Func<Ticket, bool>>? filter = null);
        Task<TicketReportStatistics> GetReportStatisticsAsync(DateTime from, DateTime to);
    }
}
