using System;
using System.Collections.Generic;

namespace HelpDesk.DAL.Results
{
    public class TicketReportStatistics
    {
        public int Created { get; set; }
        public int Resolved { get; set; }
        public int Escalated { get; set; }
        public long TotalTimeSpentSeconds { get; set; }
        public double? AvgResolutionHours { get; set; }
        public Dictionary<string, int> CreatedByCategory { get; set; } = new();
        public Dictionary<string, int> CreatedByPriority { get; set; } = new();
        public Dictionary<DateTime, int> CreatedByDay { get; set; } = new();
        public Dictionary<DateTime, int> ResolvedByDay { get; set; } = new();
        public List<AgentReportRow> ByAgent { get; set; } = new();
    }

    public class AgentReportRow
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Resolved { get; set; }
        public long TimeSpentSeconds { get; set; }
        public double? AvgResolutionHours { get; set; }
    }
}
