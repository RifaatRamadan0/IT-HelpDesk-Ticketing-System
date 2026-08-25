namespace HelpDesk.BLL.Common
{
    public enum DeleteTicketResult
    {
        Deleted,
        TicketNotFound,
        NotOwner,   // Only the employee who created the ticket may delete it.
        NotOpen     // Deleting is only allowed while the ticket is still Open.
    }
}
