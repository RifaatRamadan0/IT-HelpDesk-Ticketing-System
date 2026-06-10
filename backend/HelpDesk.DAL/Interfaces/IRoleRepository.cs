using HelpDesk.Domain.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.DAL.Interfaces
{
    public interface IRoleRepository
    {
        Task<ICollection<Role>> GetAllAsync();
    }
}
