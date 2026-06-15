using HelpDesk.BLL.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IActivityLogService
    {
        Task<ICollection<ActivityLogResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole);
    }
}
