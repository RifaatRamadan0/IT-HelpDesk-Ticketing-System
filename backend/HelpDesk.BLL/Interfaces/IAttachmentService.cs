using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IAttachmentService
    {
        Task<AttachmentUploadResult> UploadAsync(int ticketId, CreateAttachmentRequestDto request, int requestingUserId, string? requestingUserRole);

        Task<ICollection<AttachmentResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole);

        Task<AttachmentDownloadDto?> GetForDownloadAsync(int ticketId, int attachmentId, int requestingUserId, string? requestingUserRole);
    }
}
