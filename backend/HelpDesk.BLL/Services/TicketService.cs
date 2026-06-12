using AutoMapper;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.DAL.Repositories;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class TicketService : ITicketService
    {
        private readonly ITicketRepository _ticketRepository;
        private readonly IMapper _mapper;

        public TicketService(ITicketRepository ticketRepository, IMapper mapper)
        {
            _ticketRepository = ticketRepository;
            _mapper = mapper;
        }

        public async Task<int> CreateAsync(CreateTicketRequestDto request, int createdByUserId)
        {
            var ticket = new Ticket
            {
                Title = request.Title,
                Description = request.Description,
                CategoryId = request.CategoryId,
                PriorityId = request.PriorityId,
                StatusId = (int)TicketStatus.Open,
                CreatedByUserId = createdByUserId
            };

            return await _ticketRepository.CreateAsync(ticket);
        }

        public async Task<bool> UpdateAsync(int ticketId, UpdateTicketRequestDto request, int requestingUserId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return false;

            if (ticket.CreatedByUserId != requestingUserId)
                return false;

            bool isOpen = ticket.StatusId == (int)TicketStatus.Open;
            if (!isOpen)
                return false;

            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.CategoryId = request.CategoryId;
            ticket.PriorityId = request.PriorityId;
            ticket.UpdatedDate = DateTime.UtcNow;

            return await _ticketRepository.UpdateAsync(ticket);

        }

        // Status changes follow a role-specific state machine. A move is legal
        // only if the (role, current status, target status) tuple is one of the
        // allowed transitions below; everything else is rejected (controller maps
        // that to 400). Resource ownership is enforced too — an Agent may only act
        // on tickets assigned to them, an Employee only on tickets they created —
        // matching the authorization model used elsewhere in this service.
        public async Task<bool> UpdateStatusAsync(int ticketId, int statusId, int requestingUserId, string? requestingUserRole)
        {
            if (!Enum.IsDefined(typeof(TicketStatus), statusId))
                return false;

            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return false;

            var from = (TicketStatus)ticket.StatusId;
            var to = (TicketStatus)statusId;

            bool allowed = requestingUserRole switch
            {
                // Manager/Admin start the work (only once an agent is assigned)
                // and close out a resolved ticket.
                "Admin" or "Manager" =>
                    (from == TicketStatus.Open && to == TicketStatus.InProgress && ticket.AssignedToUserId != null)
                    || (from == TicketStatus.Resolved && to == TicketStatus.Closed),

                // The assigned agent hands finished work back for confirmation —
                // they cannot resolve directly; it parks in Pending.
                "Agent" =>
                    from == TicketStatus.InProgress && to == TicketStatus.Pending
                    && ticket.AssignedToUserId == requestingUserId,

                // The requester confirms the fix, moving Pending -> Resolved.
                "Employee" =>
                    from == TicketStatus.Pending && to == TicketStatus.Resolved
                    && ticket.CreatedByUserId == requestingUserId,

                _ => false
            };

            if (!allowed)
                return false;

            ticket.StatusId = statusId;
            ticket.UpdatedDate = DateTime.UtcNow;

            // The only way into Resolved is the employee's confirmation above;
            // stamp the resolution time. Resolved -> Closed keeps that timestamp.
            if (to == TicketStatus.Resolved)
                ticket.ResolvedDate ??= DateTime.UtcNow;

            return await _ticketRepository.UpdateAsync(ticket);
        }

        public async Task<bool> DeleteAsync(int ticketId, int requestingUserId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return false;

            if (ticket.CreatedByUserId != requestingUserId)
                return false;

            bool isOpen = ticket.StatusId == (int)TicketStatus.Open;
            if (!isOpen)
                return false;

            return await _ticketRepository.DeleteAsync(ticketId);
        }

        public async Task<ICollection<TicketResponseDto>> GetAllAsync()
        {
            var tickets = await _ticketRepository.GetAllAsync();

            return _mapper.Map<List<TicketResponseDto>>(tickets);
        }

        public async Task<ICollection<TicketResponseDto>> GetByAssignedUserIdAsync(int userId)
        {
            var tickets = await _ticketRepository.GetByAssignedUserIdAsync(userId);

            return _mapper.Map<List<TicketResponseDto>>(tickets);
        }

        public async Task<ICollection<TicketResponseDto>> GetByCreatedUserIdAsync(int userId)
        {
            var tickets = await _ticketRepository.GetByCreatedUserIdAsync(userId);

            return _mapper.Map<List<TicketResponseDto>>(tickets);
        }

        public async Task<TicketResponseDto?> GetByIdAsync(int ticketId, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return null;

            bool canView = requestingUserRole switch
            {
                "Admin" or "Manager" => true,
                "Employee" => ticket.CreatedByUserId == requestingUserId,
                "Agent" => ticket.AssignedToUserId == requestingUserId,
                _ => false
            };

            if (!canView)
                return null;

            return _mapper.Map<TicketResponseDto>(ticket);
        }
    }
}
