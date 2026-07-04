using HelpDesk.BLL.Common;
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
        Task<(CreateTicketResult Result, int? TicketId)> CreateAsync(CreateTicketRequestDto request, int createdByUserId);
        Task<bool> UpdateAsync(int ticketId, UpdateTicketRequestDto request, int requestingUserId);
        Task<UpdateStatusResult> UpdateStatusAsync(int ticketId, int statusId, int requestingUserId, string? requestingUserRole);
        Task<AssignTicketResult> AssignTicketAsync(int ticketId, int agentUserId, int assignedByUserId);
        Task<EscalateTicketResult> EscalateTicketAsync(int ticketId, string reason, int requestingUserId);
        Task<bool> DeleteAsync(int ticketId, int requestingUserId);
        Task<TicketResponseDto?> GetByIdAsync(int ticketId, int requestingUserId, string? requestingUserRole);
        Task<ICollection<TicketResponseDto>> GetAllAsync();
        Task<ICollection<TicketResponseDto>> GetByCreatedUserIdAsync(int userId);
        Task<ICollection<TicketResponseDto>> GetByAssignedUserIdAsync(int userId);
        Task<TicketStatisticsDto> GetStatisticsAsync(int requestingUserId, string? requestingUserRole);
        Task<TimeTrackingResponseDto?> GetTimeTrackingAsync(int ticketId, int requestingUserId, string? requestingUserRole);
        Task<TimerResult> SetTimerAsync(int ticketId, bool running, int requestingUserId, string? requestingUserRole);
    }
}
