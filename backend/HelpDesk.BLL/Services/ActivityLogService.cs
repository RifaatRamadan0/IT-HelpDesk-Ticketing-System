using AutoMapper;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class ActivityLogService : IActivityLogService
    {
        private readonly IActivityLogRepository _activityRepository;
        private readonly ITicketService _ticketService;
        private readonly IMapper _mapper;

        public ActivityLogService(
            IActivityLogRepository activityRepository,
            ITicketService ticketService,
            IMapper mapper)
        {
            _activityRepository = activityRepository;
            _ticketService = ticketService;
            _mapper = mapper;
        }

        public async Task<ICollection<ActivityLogResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketService.GetByIdAsync(ticketId, requestingUserId, requestingUserRole);
            if (ticket == null)
                return null;

            var logs = await _activityRepository.GetByTicketIdAsync(ticketId);
            return _mapper.Map<List<ActivityLogResponseDto>>(logs);
        }
    }
}
