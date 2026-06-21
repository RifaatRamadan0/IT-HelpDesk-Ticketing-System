using HelpDesk.BLL.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface INotificationService
    {
        Task<ICollection<NotificationResponseDto>> GetMineAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkReadAsync(int id, int userId);
        Task MarkAllReadAsync(int userId);

        Task NotifyUserAsync(int recipientId, string message, int ticketId);
        Task NotifyManagersAndAdminsAsync(string message, int ticketId, int excludeUserId);
    }
}
