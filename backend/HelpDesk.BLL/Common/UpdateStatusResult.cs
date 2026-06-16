namespace HelpDesk.BLL.Common
{
    public enum UpdateStatusResult
    {
        Success,
        TicketNotFound,
        NotAuthorized,      // Caller isn't a party to this ticket (wrong role, or not their ticket).
        IllegalTransition,  // Caller is authorized, but this from->to move isn't valid for them.
        InvalidStatus       // statusId isn't a defined TicketStatus.
    }
}
