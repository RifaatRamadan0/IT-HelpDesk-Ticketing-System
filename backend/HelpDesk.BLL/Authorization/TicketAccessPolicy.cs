using HelpDesk.Domain.Models;

namespace HelpDesk.BLL.Authorization
{
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
