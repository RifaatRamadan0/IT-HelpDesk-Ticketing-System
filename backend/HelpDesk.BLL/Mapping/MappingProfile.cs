using AutoMapper;
using HelpDesk.BLL.DTOs;
using HelpDesk.Domain.Models;

namespace HelpDesk.BLL.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<User, UserSummaryDto>();

            CreateMap<Category, CategoryDto>()
                .ForMember(d => d.Name, o => o.MapFrom(s => s.CategoryName));

            CreateMap<Priority, PriorityDto>()
                .ForMember(d => d.Name, o => o.MapFrom(s => s.PriorityName));

            CreateMap<Ticket, TicketResponseDto>()
                .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.CategoryName))
                .ForMember(d => d.PriorityName, o => o.MapFrom(s => s.Priority.PriorityName))
                .ForMember(d => d.StatusName, o => o.MapFrom(s => s.Status.StatusName));
            // CreatedByUser / AssignedByUser / AssignedToUser map by name using
            // the User -> UserSummaryDto map above (nulls pass through as null).
        }
    }
}
