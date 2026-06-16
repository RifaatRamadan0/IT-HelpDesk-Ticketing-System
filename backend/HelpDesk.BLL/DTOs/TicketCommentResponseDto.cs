using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.DTOs
{
    public class TicketCommentResponseDto
    {
        public int Id { get; set; }
        public string Body { get; set; } = string.Empty;
        public bool IsInternal { get; set; }
        public DateTime CreatedDate { get; set; }
        public UserSummaryDto CreatedByUser { get; set; } = null!;
    }
}
