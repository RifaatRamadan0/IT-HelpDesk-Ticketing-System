using HelpDesk.BLL.Common;
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
        private readonly ITicketCommentService _commentService;
        private readonly IActivityLogService _activityService;
        private readonly IAttachmentService _attachmentService;

        public TicketController(
            ITicketService ticketService,
            ITicketCommentService commentService,
            IActivityLogService activityService,
            IAttachmentService attachmentService)
        {
            _ticketService = ticketService;
            _commentService = commentService;
            _activityService = activityService;
            _attachmentService = attachmentService;
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

            var result = await _ticketService.UpdateStatusAsync(id, request.StatusId, userId, role);
            return result switch
            {
                UpdateStatusResult.Success => NoContent(),
                UpdateStatusResult.TicketNotFound => NotFound(),
                UpdateStatusResult.NotAuthorized => NotFound(),
                UpdateStatusResult.IllegalTransition => BadRequest("This status change isn't allowed from the ticket's current state."),
                UpdateStatusResult.InvalidStatus => BadRequest("Unknown ticket status."),
                _ => StatusCode(500)
            };
        }

        [HttpPut("{id}/assign")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> AssignTicket(int id, [FromBody] AssignTicketRequestDto request)
        {
            var assignedByUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var result = await _ticketService.AssignTicketAsync(id, request.AgentUserId, assignedByUserId);
            return result switch
            {
                AssignTicketResult.Assigned => NoContent(),
                AssignTicketResult.AlreadyAssigned => NoContent(),
                AssignTicketResult.TicketNotFound => NotFound(),
                AssignTicketResult.TicketClosed => Conflict("This ticket is resolved or closed and can't be assigned."),
                AssignTicketResult.InvalidAgent => BadRequest("The selected user is not an active agent."),
                _ => StatusCode(500)
            };
        }

        [HttpPut("{id}/escalate")]
        [Authorize(Roles = "Agent")]
        public async Task<IActionResult> EscalateTicket(int id, [FromBody] EscalateTicketRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var result = await _ticketService.EscalateTicketAsync(id, request.Reason, userId);
            return result switch
            {
                EscalateTicketResult.Escalated => NoContent(),
                EscalateTicketResult.TicketNotFound => NotFound(),
                EscalateTicketResult.NotAssignedAgent => NotFound(),
                EscalateTicketResult.NotInProgress => Conflict("Only an in-progress ticket can be escalated."),
                EscalateTicketResult.AlreadyEscalated => Conflict("This ticket has already been escalated."),
                _ => StatusCode(500)
            };
        }

        [HttpGet("{id}/comments")]
        [Authorize(Roles = "Admin,Manager,Employee,Agent")]
        public async Task<IActionResult> GetTicketComments(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            // null = the caller may not see this ticket's comments; map to 404 so the
            // ticket's existence isn't disclosed (same convention as GetTicketById).
            var comments = await _commentService.GetForTicketAsync(id, userId, role);
            if (comments == null)
                return NotFound();

            return Ok(comments);
        }

        [HttpPost("{id}/comments")]
        [Authorize(Roles = "Manager,Employee,Agent")]
        public async Task<IActionResult> AddTicketComment(int id, [FromBody] CreateTicketCommentRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var newId = await _commentService.AddAsync(id, request, userId, role);
            if (newId == null)
                return NotFound();

            return CreatedAtAction(nameof(GetTicketComments), new { id }, null);
        }

        [HttpGet("{id}/activity")]
        [Authorize(Roles = "Admin,Manager,Employee,Agent")]
        public async Task<IActionResult> GetTicketActivity(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var activity = await _activityService.GetForTicketAsync(id, userId, role);
            if (activity == null)
                return NotFound();

            return Ok(activity);
        }

        [HttpGet("{id}/attachments")]
        [Authorize(Roles = "Admin,Manager,Employee,Agent")]
        public async Task<IActionResult> GetTicketAttachments(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var attachments = await _attachmentService.GetForTicketAsync(id, userId, role);
            if (attachments == null)
                return NotFound();

            return Ok(attachments);
        }

        [HttpPost("{id}/attachments")]
        [Authorize(Roles = "Manager,Employee,Agent")]
        public async Task<IActionResult> AddTicketAttachment(int id, [FromBody] CreateAttachmentRequestDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var result = await _attachmentService.UploadAsync(id, request, userId, role);
            return result switch
            {
                AttachmentUploadResult.Created => CreatedAtAction(nameof(GetTicketAttachments), new { id }, null),
                AttachmentUploadResult.NoAccess => NotFound(),
                AttachmentUploadResult.MalformedContent => BadRequest("The file content isn't valid."),
                AttachmentUploadResult.InvalidFileType => BadRequest("That file type isn't allowed."),
                AttachmentUploadResult.FileEmpty => BadRequest("The file is empty."),
                AttachmentUploadResult.FileTooLarge => BadRequest("The file exceeds the 5 MB limit."),
                AttachmentUploadResult.ContentMismatch => BadRequest("The file's contents don't match its extension."),
                _ => StatusCode(500)
            };
        }

        [HttpGet("{id}/attachments/{attachmentId}/download")]
        [Authorize(Roles = "Admin,Manager,Employee,Agent")]
        public async Task<IActionResult> DownloadTicketAttachment(int id, int attachmentId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            var file = await _attachmentService.GetForDownloadAsync(id, attachmentId, userId, role);
            if (file == null)
                return NotFound();

            // Stop the browser from MIME-sniffing a different type than we declare.
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            // Passing a download name forces Content-Disposition: attachment, so even
            // an HTML/SVG file is saved, never rendered inline in our origin.
            return File(file.Content, file.ContentType, file.FileName);
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
