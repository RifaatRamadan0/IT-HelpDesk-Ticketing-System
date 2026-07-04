using System;
using System.Collections.Generic;

namespace HelpDesk.BLL.DTOs
{
    public class ReportDto
    {
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public int Created { get; set; }
        public int Resolved { get; set; }
        public int Escalated { get; set; }
        public double? AvgResolutionHours { get; set; }
        public double? AvgHandlingSeconds { get; set; }
        public Dictionary<string, int> ByCategory { get; set; } = new();
        public Dictionary<string, int> ByPriority { get; set; } = new();
        public List<ReportTrendPointDto> Trend { get; set; } = new();
        public List<AgentPerformanceDto> ByAgent { get; set; } = new();
    }

    public class ReportTrendPointDto
    {
        public DateTime Date { get; set; }
        public int Created { get; set; }
        public int Resolved { get; set; }
    }

    public class AgentPerformanceDto
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Resolved { get; set; }
        public long TimeSpentSeconds { get; set; }
        public double? AvgResolutionHours { get; set; }
    }
}
