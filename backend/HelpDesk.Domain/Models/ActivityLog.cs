using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.Domain.Models
{
    public class ActivityLog
    {
        public int Id { get; set; }

        public int TicketId { get; set; }
        public Ticket Ticket { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public ActivityAction ActionType { get; set; }
        public string ActionText { get; set; } = string.Empty;

        public int? OldStatusId { get; set; }
        public Status? OldStatus { get; set; }

        public int? NewStatusId { get; set; }
        public Status? NewStatus { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}
