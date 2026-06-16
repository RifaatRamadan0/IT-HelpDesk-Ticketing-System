using AutoMapper;
using HelpDesk.BLL.Authorization;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class TicketCommentService : ITicketCommentService
    {
        private readonly ITicketCommentRepository _commentRepository;
        private readonly ITicketRepository _ticketRepository;
        private readonly IActivityLogRepository _activityRepository;
        private readonly IMapper _mapper;

        public TicketCommentService(
            ITicketCommentRepository commentRepository,
            ITicketRepository ticketRepository,
            IActivityLogRepository activityRepository,
            IMapper mapper)
        {
            _commentRepository = commentRepository;
            _ticketRepository = ticketRepository;
            _activityRepository = activityRepository;
            _mapper = mapper;
        }


        private static bool CanRead(Ticket ticket, int userId, string? role) =>
            TicketAccessPolicy.CanView(ticket, userId, role);

        private static bool CanComment(Ticket ticket, int userId, string? role) => role switch
        {
            "Manager" => true,
            "Agent" => ticket.AssignedToUserId == userId,
            "Employee" => ticket.CreatedByUserId == userId,
            _ => false
        };

        private static bool CanSeeInternal(string? role) =>
            role is "Manager" or "Agent" or "Admin";

        public async Task<ICollection<TicketCommentResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null || !CanRead(ticket, requestingUserId, requestingUserRole))
                return null;

            var comments = await _commentRepository.GetByTicketIdAsync(
                ticketId, includeInternal: CanSeeInternal(requestingUserRole));
            return _mapper.Map<List<TicketCommentResponseDto>>(comments);
        }

        public async Task<int?> AddAsync(int ticketId, CreateTicketCommentRequestDto request, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null || !CanComment(ticket, requestingUserId, requestingUserRole))
                return null;

            var isInternal = request.IsInternal && requestingUserRole is "Manager" or "Agent";

            var comment = new TicketComment
            {
                TicketId = ticketId,
                CreatedByUserId = requestingUserId,
                Body = request.Body,
                IsInternal = isInternal,
                CreatedDate = DateTime.UtcNow
            };

            var commentId = await _commentRepository.CreateAsync(comment);

            if (!isInternal)
            {
                await _activityRepository.CreateAsync(new ActivityLog
                {
                    TicketId = ticketId,
                    UserId = requestingUserId,
                    ActionType = ActivityAction.CommentAdded,
                    ActionText = "added a comment"
                });
            }

            return commentId;
        }
    }
}
