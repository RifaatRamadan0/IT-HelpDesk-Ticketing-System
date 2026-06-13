using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IUserService
    {
        Task<ICollection<UserListItemDto>> GetAllAsync();

        // Active agents, projected to a minimal summary for assignment pickers.
        Task<ICollection<UserSummaryDto>> GetAgentsAsync();

        Task<int?> CreateAsync(CreateUserRequestDto request, int createdByUserId);

        Task<bool> UpdateAsync(int id, UpdateUserRequestDto request);
        Task<DeleteUserResult> DeleteAsync(int id);
    }
}
