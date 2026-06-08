using AutoMapper;
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
    public class PriorityService : IPriorityService
    {
        private readonly IPriorityRepository _priorityRepository;
        private readonly IMapper _mapper;

        public PriorityService(IPriorityRepository priorityRepository, IMapper mapper)
        {
            _priorityRepository = priorityRepository;
            _mapper = mapper;
        }

        public async Task<ICollection<PriorityDto>> GetAllAsync()
        {
            var priorities = await _priorityRepository.GetAllAsync();
            return _mapper.Map<List<PriorityDto>>(priorities);
        }
    }
}
