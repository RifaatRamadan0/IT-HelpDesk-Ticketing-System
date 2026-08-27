using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly ITokenService _tokenService;

        public AuthService(
            IUserRepository userRepository,
            IRefreshTokenRepository refreshTokenRepository,
            ITokenService tokenService)
        {
            _userRepository = userRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _tokenService = tokenService;
        }

        public static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);

        public async Task<(string AccessToken, string RefreshToken)?> LoginAsync(LoginRequestDto request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return null;

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = await IssueRefreshTokenAsync(user.Id);

            return (accessToken, refreshToken);
        }

        public async Task<(string AccessToken, string RefreshToken)?> RefreshAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken))
                return null;

            var hash = _tokenService.HashRefreshToken(refreshToken);
            var stored = await _refreshTokenRepository.GetByHashAsync(hash);

            if (stored == null)
                return null;

            if (stored.IsRevoked)
            {
                await _refreshTokenRepository.RevokeAllByUserIdAsync(stored.UserId);
                return null;
            }

            if (stored.ExpiresDate < DateTime.UtcNow)
                return null;

            await _refreshTokenRepository.RevokeAsync(stored.Id);

            var accessToken = _tokenService.GenerateAccessToken(stored.User);
            var newRefreshToken = await IssueRefreshTokenAsync(stored.UserId);

            return (accessToken, newRefreshToken);
        }

        public async Task LogoutAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken))
                return;

            var hash = _tokenService.HashRefreshToken(refreshToken);
            await _refreshTokenRepository.RevokeByHashAsync(hash);
        }

        private async Task<string> IssueRefreshTokenAsync(int userId)
        {
            var refreshToken = _tokenService.GenerateRefreshToken();

            await _refreshTokenRepository.AddAsync(new RefreshToken
            {
                UserId = userId,
                TokenHash = _tokenService.HashRefreshToken(refreshToken),
                CreatedDate = DateTime.UtcNow,
                ExpiresDate = DateTime.UtcNow.Add(RefreshTokenLifetime)
            });

            return refreshToken;
        }
    }
}
