using AutoMapper;
using HelpDesk.BLL.Authorization;
using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.DAL.Repositories;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class TicketService : ITicketService
    {
        private readonly ITicketRepository _ticketRepository;
        private readonly IUserRepository _userRepository;
        private readonly IActivityLogRepository _activityRepository;
        private readonly ITicketCommentRepository _commentRepository;
        private readonly ICategoryRepository _categoryRepository;
        private readonly IPriorityRepository _priorityRepository;
        private readonly INotificationService _notificationService;
        private readonly IMapper _mapper;

        public TicketService(
            ITicketRepository ticketRepository,
            IUserRepository userRepository,
            IActivityLogRepository activityRepository,
            ITicketCommentRepository commentRepository,
            ICategoryRepository categoryRepository,
            IPriorityRepository priorityRepository,
            INotificationService notificationService,
            IMapper mapper)
        {
            _ticketRepository = ticketRepository;
            _userRepository = userRepository;
            _activityRepository = activityRepository;
            _commentRepository = commentRepository;
            _categoryRepository = categoryRepository;
            _priorityRepository = priorityRepository;
            _notificationService = notificationService;
            _mapper = mapper;
        }

        public async Task<(CreateTicketResult Result, int? TicketId)> CreateAsync(CreateTicketRequestDto request, int createdByUserId)
        {
            if (!await _categoryRepository.ExistsAsync(request.CategoryId))
                return (CreateTicketResult.InvalidCategory, null);

            if (!await _priorityRepository.ExistsAsync(request.PriorityId))
                return (CreateTicketResult.InvalidPriority, null);

            var ticket = new Ticket
            {
                Title = request.Title,
                Description = request.Description,
                CategoryId = request.CategoryId,
                PriorityId = request.PriorityId,
                StatusId = (int)TicketStatus.Open,
                CreatedByUserId = createdByUserId
            };

            var ticketId = await _ticketRepository.CreateAsync(ticket);

            await _activityRepository.CreateAsync(new ActivityLog
            {
                TicketId = ticketId,
                UserId = createdByUserId,
                ActionType = ActivityAction.Created,
                ActionText = "created the ticket"
            });

            await _notificationService.NotifyManagersAndAdminsAsync(
                $"New ticket #{ticketId}: {ticket.Title}", ticketId, createdByUserId);

            return (CreateTicketResult.Created, ticketId);
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

        public async Task<UpdateStatusResult> UpdateStatusAsync(int ticketId, int statusId, int requestingUserId, string? requestingUserRole)
        {
            if (!Enum.IsDefined(typeof(TicketStatus), statusId))
                return UpdateStatusResult.InvalidStatus;

            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return UpdateStatusResult.TicketNotFound;

            var from = (TicketStatus)ticket.StatusId;
            var to = (TicketStatus)statusId;

            bool authorized = requestingUserRole switch
            {
                "Admin" or "Manager" => true,
                "Agent" => ticket.AssignedToUserId == requestingUserId,
                "Employee" => ticket.CreatedByUserId == requestingUserId,
                _ => false
            };

            if (!authorized)
                return UpdateStatusResult.NotAuthorized;

            bool legalTransition = requestingUserRole switch
            {
                "Admin" or "Manager" =>
                    (from == TicketStatus.Open && to == TicketStatus.InProgress && ticket.AssignedToUserId != null)
                    || (from == TicketStatus.Resolved && to == TicketStatus.Closed),

                "Agent" =>
                    from == TicketStatus.InProgress && to == TicketStatus.Pending,

                "Employee" =>
                    from == TicketStatus.Pending
                    && (to == TicketStatus.Resolved || to == TicketStatus.InProgress),

                _ => false
            };

            if (!legalTransition)
                return UpdateStatusResult.IllegalTransition;

            ticket.StatusId = statusId;
            ticket.UpdatedDate = DateTime.UtcNow;

            if (from == TicketStatus.InProgress && to != TicketStatus.InProgress)
                ticket.IsEscalated = false;

            if (to == TicketStatus.Resolved)
                ticket.ResolvedDate ??= DateTime.UtcNow;

            var updated = await _ticketRepository.UpdateAsync(ticket);
            if (!updated)
                return UpdateStatusResult.TicketNotFound;

            await _activityRepository.CreateAsync(new ActivityLog
            {
                TicketId = ticketId,
                UserId = requestingUserId,
                ActionType = ActivityAction.StatusChanged,
                ActionText = $"changed status from {from} to {to}",
                OldStatusId = (int)from,
                NewStatusId = (int)to
            });

            var statusMessage = $"Ticket #{ticketId} is now {to}";
            if (ticket.CreatedByUserId != requestingUserId)
                await _notificationService.NotifyUserAsync(ticket.CreatedByUserId, statusMessage, ticketId);
            if (ticket.AssignedToUserId != null && ticket.AssignedToUserId != requestingUserId)
                await _notificationService.NotifyUserAsync(ticket.AssignedToUserId.Value, statusMessage, ticketId);

            return UpdateStatusResult.Success;
        }

        public async Task<AssignTicketResult> AssignTicketAsync(int ticketId, int agentUserId, int assignedByUserId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return AssignTicketResult.TicketNotFound;

            var status = (TicketStatus)ticket.StatusId;
            if (status == TicketStatus.Resolved || status == TicketStatus.Closed)
                return AssignTicketResult.TicketClosed;

            if (ticket.AssignedToUserId == agentUserId)
                return AssignTicketResult.AlreadyAssigned;

            var agent = await _userRepository.GetByIdAsync(agentUserId);
            if (agent == null || !agent.IsActive || agent.Role?.RoleName != "Agent")
                return AssignTicketResult.InvalidAgent;

            // Capture whether this is a first assignment or a reassignment before
            // overwriting, so the log records the right action.
            bool wasAssigned = ticket.AssignedToUserId != null;

            ticket.AssignedToUserId = agentUserId;
            ticket.AssignedByUserId = assignedByUserId;
            ticket.UpdatedDate = DateTime.UtcNow;

            ticket.IsEscalated = false;

            await _ticketRepository.UpdateAsync(ticket);

            await _activityRepository.CreateAsync(new ActivityLog
            {
                TicketId = ticketId,
                UserId = assignedByUserId,
                ActionType = wasAssigned ? ActivityAction.Reassigned : ActivityAction.Assigned,
                ActionText = $"{(wasAssigned ? "reassigned" : "assigned")} to {agent.FirstName} {agent.LastName}"
            });

            await _notificationService.NotifyUserAsync(
                agentUserId, $"Ticket #{ticketId} was assigned to you", ticketId);

            return AssignTicketResult.Assigned;
        }

        public async Task<EscalateTicketResult> EscalateTicketAsync(int ticketId, string reason, int requestingUserId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return EscalateTicketResult.TicketNotFound;

            if (ticket.AssignedToUserId != requestingUserId)
                return EscalateTicketResult.NotAssignedAgent;

            if ((TicketStatus)ticket.StatusId != TicketStatus.InProgress)
                return EscalateTicketResult.NotInProgress;

            if (ticket.IsEscalated)
                return EscalateTicketResult.AlreadyEscalated;

            ticket.IsEscalated = true;
            ticket.UpdatedDate = DateTime.UtcNow;
            await _ticketRepository.UpdateAsync(ticket);

            await _commentRepository.CreateAsync(new TicketComment
            {
                TicketId = ticketId,
                CreatedByUserId = requestingUserId,
                Body = reason,
                IsInternal = true,
                CreatedDate = DateTime.UtcNow
            });

            await _activityRepository.CreateAsync(new ActivityLog
            {
                TicketId = ticketId,
                UserId = requestingUserId,
                ActionType = ActivityAction.Escalated,
                ActionText = "escalated this ticket"
            });

            await _notificationService.NotifyManagersAndAdminsAsync(
                $"Ticket #{ticketId} was escalated", ticketId, requestingUserId);

            return EscalateTicketResult.Escalated;
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

            if (!TicketAccessPolicy.CanView(ticket, requestingUserId, requestingUserRole))
                return null;

            return _mapper.Map<TicketResponseDto>(ticket);
        }

        public async Task<TicketStatisticsDto> GetStatisticsAsync(int requestingUserId, string? requestingUserRole)
        {
            Expression<Func<Ticket, bool>>? filter = requestingUserRole switch
            {
                "Employee" => t => t.CreatedByUserId == requestingUserId,
                "Agent" => t => t.AssignedToUserId == requestingUserId,
                _ => null
            };

            var stats = await _ticketRepository.GetStatisticsAsync(filter);

            int CountFor(TicketStatus status) => stats.CountByStatus.GetValueOrDefault((int)status);

            int total = stats.CountByStatus.Values.Sum();
            int resolved = CountFor(TicketStatus.Resolved) + CountFor(TicketStatus.Closed);

            return new TicketStatisticsDto
            {
                Total = total,
                Open = total - resolved,
                InProgress = CountFor(TicketStatus.InProgress),
                Pending = CountFor(TicketStatus.Pending),
                Resolved = resolved,
                Critical = stats.CriticalOpen,
                AvgResolutionHours = stats.AvgResolutionHours,
                ByCategory = stats.CountByCategory,
                ByPriority = stats.CountByPriority
            };
        }
    }
}
