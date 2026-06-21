using AutoMapper;
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
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public NotificationService(
            INotificationRepository notificationRepository,
            IUserRepository userRepository,
            IMapper mapper)
        {
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<ICollection<NotificationResponseDto>> GetMineAsync(int userId)
        {
            var notifications = await _notificationRepository.GetByUserIdAsync(userId);
            return _mapper.Map<List<NotificationResponseDto>>(notifications);
        }

        public Task<int> GetUnreadCountAsync(int userId) =>
            _notificationRepository.GetUnreadCountAsync(userId);

        public Task<bool> MarkReadAsync(int id, int userId) =>
            _notificationRepository.MarkReadAsync(id, userId);

        public Task MarkAllReadAsync(int userId) =>
            _notificationRepository.MarkAllReadAsync(userId);

        public Task NotifyUserAsync(int recipientId, string message, int ticketId)
        {
            return _notificationRepository.CreateAsync(new Notification
            {
                UserId = recipientId,
                Message = message,
                TicketId = ticketId
            });
        }

        public async Task NotifyManagersAndAdminsAsync(string message, int ticketId, int excludeUserId)
        {
            var recipients = await _userRepository.GetManagersAndAdminsAsync();

            var notifications = recipients
                .Where(u => u.Id != excludeUserId)
                .Select(u => new Notification
                {
                    UserId = u.Id,
                    Message = message,
                    TicketId = ticketId
                })
                .ToList();

            if (notifications.Count == 0)
                return;

            await _notificationRepository.CreateManyAsync(notifications);
        }
    }
}
