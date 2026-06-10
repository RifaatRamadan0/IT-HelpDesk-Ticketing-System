using HelpDesk.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IRoleService
    {
        Task<ICollection<RoleDto>> GetAllAsync();
    }
}
