using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface ITicketCommentRepository
    {
        Task<int> CreateAsync(TicketComment comment);

        Task<ICollection<TicketComment>> GetByTicketIdAsync(int ticketId, bool includeInternal);
    }
}
