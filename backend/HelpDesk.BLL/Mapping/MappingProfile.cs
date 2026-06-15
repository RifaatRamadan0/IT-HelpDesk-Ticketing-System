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

            CreateMap<User, UserListItemDto>()
                .ForMember(d => d.RoleName, o => o.MapFrom(s => s.Role.RoleName));

            CreateMap<Category, CategoryDto>()
                .ForMember(d => d.Name, o => o.MapFrom(s => s.CategoryName));

            CreateMap<Priority, PriorityDto>()
                .ForMember(d => d.Name, o => o.MapFrom(s => s.PriorityName));

            CreateMap<Role, RoleDto>()
                .ForMember(d => d.Name, o => o.MapFrom(s => s.RoleName));

            CreateMap<Ticket, TicketResponseDto>()
                .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.CategoryName))
                .ForMember(d => d.PriorityName, o => o.MapFrom(s => s.Priority.PriorityName))
                .ForMember(d => d.StatusName, o => o.MapFrom(s => s.Status.StatusName));

            // CreatedByUser maps by name via the User -> UserSummaryDto map above.
            CreateMap<TicketComment, TicketCommentResponseDto>();

            // ActionType (enum) maps to its string name automatically; status names
            // come from the nullable Old/New navs; User via User -> UserSummaryDto.
            CreateMap<ActivityLog, ActivityLogResponseDto>()
                .ForMember(d => d.OldStatusName, o => o.MapFrom(s => s.OldStatus != null ? s.OldStatus.StatusName : null))
                .ForMember(d => d.NewStatusName, o => o.MapFrom(s => s.NewStatus != null ? s.NewStatus.StatusName : null));
            // CreatedByUser / AssignedByUser / AssignedToUser map by name using
            // the User -> UserSummaryDto map above (nulls pass through as null).
        }
    }
}
