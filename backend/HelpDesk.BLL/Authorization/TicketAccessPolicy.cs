using HelpDesk.Domain.Models;

namespace HelpDesk.BLL.Authorization
{
    /// <summary>
    /// Single source of truth for "who may view a given ticket."
    ///
    /// Both ticket-detail reads and comment-thread reads gate on this, because
    /// comment visibility is a sub-permission of ticket visibility: you can never
    /// read a ticket's comments without being able to read the ticket itself.
    /// Callers that need a stricter rule than plain visibility (e.g. who may *write*
    /// a comment, or which internal notes are shown) keep that extra constraint at
    /// their own call site rather than restating the baseline here.
    /// </summary>
    public static class TicketAccessPolicy
    {
        public static bool CanView(Ticket ticket, int userId, string? role) => role switch
        {
            "Admin" or "Manager" => true,
            "Employee" => ticket.CreatedByUserId == userId,
            "Agent" => ticket.AssignedToUserId == userId,
            _ => false
        };
    }
}
