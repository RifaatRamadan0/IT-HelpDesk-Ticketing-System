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

        public PriorityService(IPriorityRepository priorityRepository)
        {
            _priorityRepository = priorityRepository;
        }

        public async Task<ICollection<PriorityDto>> GetAllAsync()
        {
            var priorities = await _priorityRepository.GetAllAsync();
            return priorities
                .Select(p => new PriorityDto { Id = p.Id, Name = p.PriorityName })
                .ToList();
        }
    }
}
