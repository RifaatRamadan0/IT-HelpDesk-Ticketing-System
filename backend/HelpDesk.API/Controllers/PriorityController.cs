using HelpDesk.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDesk_API.Controllers
{
    [Route("api/Priority")]
    [ApiController]
    [Authorize]
    public class PriorityController : ControllerBase
    {
        private readonly IPriorityService _priorityService;

        public PriorityController(IPriorityService priorityService)
        {
            _priorityService = priorityService;
        }

        // Any authenticated user may read the lookup list — the Create Ticket
        // form (Employee role) needs it to populate its priority dropdown.
        [HttpGet]
        public async Task<IActionResult> GetAllPriorities()
        {
            var priorities = await _priorityService.GetAllAsync();
            return Ok(priorities);
        }
    }
}
