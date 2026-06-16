using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.Domain.Models
{
    public class Ticket
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; } = null!;

        public int? AssignedByUserId { get; set; }
        public User? AssignedByUser { get; set; }

        public int? AssignedToUserId { get; set; }
        public User? AssignedToUser { get; set; }

        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;

        public int PriorityId { get; set; }
        public Priority Priority { get; set; } = null!;

        public int StatusId { get; set; }
        public Status Status { get; set; } = null!;

        public bool IsEscalated { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedDate { get; set; }
    }
}
