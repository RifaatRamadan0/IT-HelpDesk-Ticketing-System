using HelpDesk.BLL.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface ITicketService
    {
        Task<int> CreateAsync(CreateTicketRequestDto request, int createdByUserId);
        Task<bool> UpdateAsync(int ticketId, UpdateTicketRequestDto request, int requestingUserId);
        Task<bool> UpdateStatusAsync(int ticketId, int statusId, int requestingUserId, string? requestingUserRole);
        Task<bool> DeleteAsync(int ticketId, int requestingUserId);
        Task<TicketResponseDto?> GetByIdAsync(int ticketId, int requestingUserId, string? requestingUserRole);
        Task<ICollection<TicketResponseDto>> GetAllAsync();
        Task<ICollection<TicketResponseDto>> GetByCreatedUserIdAsync(int userId);
        Task<ICollection<TicketResponseDto>> GetByAssignedUserIdAsync(int userId);
    }
}
