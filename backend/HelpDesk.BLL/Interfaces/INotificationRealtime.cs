using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface INotificationRealtime
    {
        Task NotifyUserAsync(int userId);
    }
}
