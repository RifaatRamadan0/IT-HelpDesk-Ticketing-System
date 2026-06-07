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

        public TicketService(ITicketRepository ticketRepository)
        {
            _ticketRepository = ticketRepository;
        }

        private TicketResponseDto MapToResponseDto(Ticket ticket)
        {
            return new TicketResponseDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                CategoryId = ticket.CategoryId,
                CategoryName = ticket.Category.CategoryName,
                PriorityId = ticket.PriorityId,
                PriorityName = ticket.Priority.PriorityName,
                StatusId = ticket.StatusId,
                StatusName = ticket.Status.StatusName,
                CreatedByUser = new UserSummaryDto
                {
                    Id = ticket.CreatedByUser.Id,
                    FirstName = ticket.CreatedByUser.FirstName,
                    LastName = ticket.CreatedByUser.LastName
                },
                AssignedByUser = ticket.AssignedByUser == null ? null : new UserSummaryDto
                {
                    Id = ticket.AssignedByUser.Id,
                    FirstName = ticket.AssignedByUser.FirstName,
                    LastName = ticket.AssignedByUser.LastName
                },
                AssignedToUser = ticket.AssignedToUser == null ? null : new UserSummaryDto
                {
                    Id = ticket.AssignedToUser.Id,
                    FirstName = ticket.AssignedToUser.FirstName,
                    LastName = ticket.AssignedToUser.LastName
                },
                CreatedDate = ticket.CreatedDate,
                UpdatedDate = ticket.UpdatedDate,
                ResolvedDate = ticket.ResolvedDate
            };
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

        public async Task<bool> UpdateAsync(int ticketId, UpdateTicketRequestDto request)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
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

        public async Task<bool> DeleteAsync(int ticketId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return false;

            bool isOpen = ticket.StatusId == (int)TicketStatus.Open;
            if (!isOpen)
                return false;

            return await _ticketRepository.DeleteAsync(ticketId);
        }

        public async Task<ICollection<TicketResponseDto>> GetAllAsync()
        {
            var tickets = await _ticketRepository.GetAllAsync();

            return tickets.Select(MapToResponseDto).ToList();
        }

        public async Task<ICollection<TicketResponseDto>> GetByAssignedUserIdAsync(int userId)
        {
            var tickets = await _ticketRepository.GetByAssignedUserIdAsync(userId);

            return tickets.Select(MapToResponseDto).ToList();
        }

        public async Task<ICollection<TicketResponseDto>> GetByCreatedUserIdAsync(int userId)
        {
            var tickets = await _ticketRepository.GetByCreatedUserIdAsync(userId);

            return tickets.Select(MapToResponseDto).ToList();
        }

        public async Task<TicketResponseDto?> GetByIdAsync(int ticketId)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null)
                return null;

            return MapToResponseDto(ticket);
        }
    }
}
