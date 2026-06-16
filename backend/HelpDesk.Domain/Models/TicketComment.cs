using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.Domain.Models
{
    public class TicketComment
    {
        public int Id { get; set; }

        public int TicketId { get; set; }
        public Ticket Ticket { get; set; } = null!;

        public int CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; } = null!;

        public string Body { get; set; } = string.Empty;

        public bool IsInternal { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}
