namespace HelpDesk.BLL.Common
{
    public enum UpdateTicketResult
    {
        Updated,
        TicketNotFound,
        NotOwner,   // Only the employee who created the ticket may edit it.
        NotOpen     // Editing is only allowed while the ticket is still Open.
    }
}
