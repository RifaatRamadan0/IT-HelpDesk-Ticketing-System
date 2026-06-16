namespace HelpDesk.BLL.Common
{
    public enum EscalateTicketResult
    {
        Escalated,
        TicketNotFound,
        NotAssignedAgent,  // Caller isn't the agent this ticket is assigned to.
        NotInProgress,     // Only an In-Progress ticket can be escalated.
        AlreadyEscalated   // Idempotent guard — avoids duplicate notes/log entries.
    }
}
