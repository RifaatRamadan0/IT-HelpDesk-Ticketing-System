using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IUserService
    {
        Task<ICollection<UserListItemDto>> GetAllAsync();

        Task<int?> CreateAsync(CreateUserRequestDto request, int createdByUserId);

        Task<bool> UpdateAsync(int id, UpdateUserRequestDto request);
        Task<DeleteUserResult> DeleteAsync(int id);
    }
}
