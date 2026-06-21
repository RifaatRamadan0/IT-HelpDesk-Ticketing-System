using System.Collections.Generic;

namespace HelpDesk.DAL.Interfaces
{
    public class TicketStatistics
    {
        public Dictionary<int, int> CountByStatus { get; set; } = new();
        public Dictionary<string, int> CountByPriority { get; set; } = new();
        public Dictionary<string, int> CountByCategory { get; set; } = new();
        public int CriticalOpen { get; set; }
        public double? AvgResolutionHours { get; set; }
    }
}
