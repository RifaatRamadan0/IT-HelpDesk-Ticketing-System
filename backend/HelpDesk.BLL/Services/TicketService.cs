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
