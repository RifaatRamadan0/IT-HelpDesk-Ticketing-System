using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface IActivityLogRepository
    {
        Task<int> CreateAsync(ActivityLog log);
        Task<ICollection<ActivityLog>> GetByTicketIdAsync(int ticketId);
    }
}
