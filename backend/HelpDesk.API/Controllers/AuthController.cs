using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HelpDesk_API.Controllers
{
    [Route("api/Auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto loginRequest)
        {
            var loginResponse = await _authService.LoginAsync(loginRequest);
            if (loginResponse == null)
                return Unauthorized();
            return Ok(loginResponse);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto refreshRequest)
        {
            var loginResponse = await _authService.RefreshAsync(refreshRequest);
            if (loginResponse == null)
                return Unauthorized();
            return Ok(loginResponse);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _authService.LogoutAsync(userId);
            return NoContent();
        }

    }
}
