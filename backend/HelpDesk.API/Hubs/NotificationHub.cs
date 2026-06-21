using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HelpDesk_API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
    }
}
