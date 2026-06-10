using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HelpDesk_API.Controllers
{
    [Route("api/User")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto request)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var newId = await _userService.CreateAsync(request, adminId);
            if (newId == null)
                return Conflict("A user with that email already exists.");

            return CreatedAtAction(nameof(GetAllUsers), null, null);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequestDto request)
        {
            var updated = await _userService.UpdateAsync(id, request);
            if (!updated)
                return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            if (id == adminId)
                return BadRequest("You cannot delete your own account.");

            var result = await _userService.DeleteAsync(id);
            return result switch
            {
                DeleteUserResult.Deleted => NoContent(),
                DeleteUserResult.NotFound => NotFound(),
                DeleteUserResult.HasRelatedData => Conflict(
                    "This user has related tickets and can't be deleted. Deactivate the account instead."),
                _ => StatusCode(500)
            };
        }
    }
}
