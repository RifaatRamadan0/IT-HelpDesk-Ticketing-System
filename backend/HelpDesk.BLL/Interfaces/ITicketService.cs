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
        Task<bool> UpdateAsync(int ticketId, UpdateTicketRequestDto request);
        Task<bool> DeleteAsync(int ticketId);
        Task<TicketResponseDto?> GetByIdAsync(int ticketId);
        Task<ICollection<TicketResponseDto>> GetAllAsync();
        Task<ICollection<TicketResponseDto>> GetByCreatedUserIdAsync(int userId);
        Task<ICollection<TicketResponseDto>> GetByAssignedUserIdAsync(int userId);
    }
}
