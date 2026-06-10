using AutoMapper;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class RoleService : IRoleService
    {
        private readonly IRoleRepository _roleRepository;
        private readonly IMapper _mapper;

        public RoleService(IRoleRepository roleRepository, IMapper mapper)
        {
            _roleRepository = roleRepository;
            _mapper = mapper;
        }

        public async Task<ICollection<RoleDto>> GetAllAsync()
        {
            var roles = await _roleRepository.GetAllAsync();
            return _mapper.Map<List<RoleDto>>(roles);
        }
    }
}
