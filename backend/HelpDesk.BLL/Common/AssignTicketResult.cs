namespace HelpDesk.BLL.Common
{
    public enum AssignTicketResult
    {
        Assigned,
        TicketNotFound,
        TicketClosed,   // Resolved/Closed: assigning finished work is invalid.
        InvalidAgent    // Target doesn't exist, is inactive, or isn't an Agent.
    }
}
