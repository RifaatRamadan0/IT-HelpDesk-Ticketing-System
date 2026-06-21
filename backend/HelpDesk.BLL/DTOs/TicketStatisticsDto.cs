using System.Collections.Generic;

namespace HelpDesk.BLL.DTOs
{
    public class TicketStatisticsDto
    {
        public int Total { get; set; }
        public int Open { get; set; }
        public int InProgress { get; set; }
        public int Pending { get; set; }
        public int Resolved { get; set; }
        public int Critical { get; set; }
        public double? AvgResolutionHours { get; set; }
        public Dictionary<string, int> ByCategory { get; set; } = new();
        public Dictionary<string, int> ByPriority { get; set; } = new();
    }
}
