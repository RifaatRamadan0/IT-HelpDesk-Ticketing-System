using HelpDesk.BLL.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface ITicketCommentService
    {
        Task<ICollection<TicketCommentResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole);

        Task<int?> AddAsync(int ticketId, CreateTicketCommentRequestDto request, int requestingUserId, string? requestingUserRole);
    }
}
