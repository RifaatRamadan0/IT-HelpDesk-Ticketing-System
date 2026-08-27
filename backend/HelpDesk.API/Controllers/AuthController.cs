using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.BLL.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HelpDesk_API.Controllers
{
    [Route("api/Auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IWebHostEnvironment _environment;

        private const string RefreshCookieName = "refreshToken";

        public AuthController(IAuthService authService, IWebHostEnvironment environment)
        {
            _authService = authService;
            _environment = environment;
        }

        private CookieOptions RefreshCookieOptions(DateTimeOffset? expires = null) => new()
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment(),
            SameSite = _environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
            Path = "/api/Auth",
            Expires = expires
        };

        private void SetRefreshCookie(string refreshToken)
        {
            Response.Cookies.Append(
                RefreshCookieName,
                refreshToken,
                RefreshCookieOptions(DateTimeOffset.UtcNow.Add(AuthService.RefreshTokenLifetime)));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto loginRequest)
        {
            var result = await _authService.LoginAsync(loginRequest);
            if (result == null)
                return Unauthorized();

            SetRefreshCookie(result.Value.RefreshToken);
            return Ok(new LoginResponseDto { AccessToken = result.Value.AccessToken });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies[RefreshCookieName];

            var result = await _authService.RefreshAsync(refreshToken ?? string.Empty);
            if (result == null)
            {
                Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());
                return Unauthorized();
            }

            SetRefreshCookie(result.Value.RefreshToken);
            return Ok(new LoginResponseDto { AccessToken = result.Value.AccessToken });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies[RefreshCookieName];
            if (refreshToken != null)
                await _authService.LogoutAsync(refreshToken);

            Response.Cookies.Delete(RefreshCookieName, RefreshCookieOptions());
            return NoContent();
        }
    }
}
