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
        private readonly INotificationRealtime _realtime;
        private readonly IMapper _mapper;

        public NotificationService(
            INotificationRepository notificationRepository,
            IUserRepository userRepository,
            INotificationRealtime realtime,
            IMapper mapper)
        {
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
            _realtime = realtime;
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

        public async Task NotifyUserAsync(int recipientId, string message, int ticketId)
        {
            await _notificationRepository.CreateAsync(new Notification
            {
                UserId = recipientId,
                Message = message,
                TicketId = ticketId
            });

            await _realtime.NotifyUserAsync(recipientId);
        }

        public async Task NotifyManagersAndAdminsAsync(string message, int ticketId, int excludeUserId)
        {
            var recipients = await _userRepository.GetManagersAndAdminsAsync();

            var targets = recipients
                .Where(u => u.Id != excludeUserId)
                .ToList();

            if (targets.Count == 0)
                return;

            await _notificationRepository.CreateManyAsync(targets.Select(u => new Notification
            {
                UserId = u.Id,
                Message = message,
                TicketId = ticketId
            }));

            foreach (var u in targets)
                await _realtime.NotifyUserAsync(u.Id);
        }
    }
}
