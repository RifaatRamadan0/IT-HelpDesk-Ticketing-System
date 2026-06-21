using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface INotificationRepository
    {
        Task<int> CreateAsync(Notification notification);
        Task CreateManyAsync(IEnumerable<Notification> notifications);
        Task<ICollection<Notification>> GetByUserIdAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkReadAsync(int id, int userId);
        Task<int> MarkAllReadAsync(int userId);
    }
}
