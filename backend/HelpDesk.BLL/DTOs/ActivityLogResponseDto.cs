using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.DTOs
{
    public class ActivityLogResponseDto
    {
        public int Id { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string ActionText { get; set; } = string.Empty;
        public string? OldStatusName { get; set; }
        public string? NewStatusName { get; set; }
        public DateTime CreatedDate { get; set; }
        public UserSummaryDto User { get; set; } = null!;
    }
}
