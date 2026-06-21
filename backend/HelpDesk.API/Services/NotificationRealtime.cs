using HelpDesk.BLL.Interfaces;
using HelpDesk_API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HelpDesk_API.Services
{
    public class NotificationRealtime : INotificationRealtime
    {
        private readonly IHubContext<NotificationHub> _hub;

        public NotificationRealtime(IHubContext<NotificationHub> hub)
        {
            _hub = hub;
        }

        public Task NotifyUserAsync(int userId)
        {
            return _hub.Clients.User(userId.ToString()).SendAsync("ReceiveNotification");
        }
    }
}
