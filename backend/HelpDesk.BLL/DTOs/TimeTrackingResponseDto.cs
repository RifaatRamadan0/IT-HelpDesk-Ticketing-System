using System;

namespace HelpDesk.BLL.DTOs
{
    public class TimeTrackingResponseDto
    {
        public int TimeSpentSeconds { get; set; }
        public DateTime? TimerStartedAt { get; set; }
        public DateTime ServerTimeUtc { get; set; }
    }
}
