using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HelpDesk_API.Controllers
{
    [Route("api/Ticket")]
    [ApiController]
    [Authorize]
    public class TicketController : ControllerBase
    {
        private readonly ITicketService _ticketService;

        public TicketController(ITicketService ticketService)
        {
            _ticketService = ticketService;
        }

        [Authorize(Roles = "Employee")]
        [HttpPost]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            try
            {
                var ticketId = await _ticketService.CreateAsync(request, userId);
                return CreatedAtAction(nameof(GetTicketById), new { id = ticketId }, null);
            }
            catch
            {
                return BadRequest("Failed to create ticket.");
            }

        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee,Agent")]
        public async Task<IActionResult> GetTicketById(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            // The service applies resource-level authorization and returns null
            // when the caller may not see this ticket; we map that to 404 (not
            // 403) so other users' tickets aren't disclosed by existence.
            var ticket = await _ticketService.GetByIdAsync(id, userId, role);
            if (ticket == null)
                return NotFound();

            return Ok(ticket);
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> GetAllTickets()
        {
            var tickets = await _ticketService.GetAllAsync();
            return Ok(tickets);
        }

        [HttpGet("assigned")]
        [Authorize(Roles = "Agent")]
        public async Task<IActionResult> GetAssignedTickets()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var tickets = await _ticketService.GetByAssignedUserIdAsync(userId);
            return Ok(tickets);
        }

        [HttpGet("mine")]
        [Authorize(Roles = "Employee")]
        public async Task<IActionResult> GetMyTickets()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var tickets = await _ticketService.GetByCreatedUserIdAsync(userId);
            return Ok(tickets);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Employee")]
        public async Task<IActionResult> UpdateTicket(int id, [FromBody] UpdateTicketRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isUpdated = await _ticketService.UpdateAsync(id, request, userId);
            if (!isUpdated)
                return BadRequest("Failed to update ticket.");
            return NoContent();
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Manager,Agent,Employee")]
        public async Task<IActionResult> UpdateTicketStatus(int id, [FromBody] UpdateTicketStatusRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var isUpdated = await _ticketService.UpdateStatusAsync(id, request.StatusId, userId, role);
            if (!isUpdated)
                return BadRequest("Failed to update ticket status.");
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Employee")]
        public async Task<IActionResult> DeleteTicket(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var isDeleted = await _ticketService.DeleteAsync(id, userId);
            if (!isDeleted)
                return BadRequest("Failed to delete ticket.");
            return NoContent();
        }
    }
}
