using HelpDesk.BLL.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IAuthService
    {
        Task<(string AccessToken, string RefreshToken)?> LoginAsync(LoginRequestDto request);
        Task<(string AccessToken, string RefreshToken)?> RefreshAsync(string refreshToken);
        Task LogoutAsync(string refreshToken);
    }
}
