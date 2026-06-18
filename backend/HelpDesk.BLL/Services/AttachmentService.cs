using AutoMapper;
using HelpDesk.BLL.Authorization;
using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class AttachmentService : IAttachmentService
    {
        private readonly IAttachmentRepository _attachmentRepository;
        private readonly ITicketRepository _ticketRepository;
        private readonly IFileStorageService _fileStorage;
        private readonly IMapper _mapper;

        public AttachmentService(
            IAttachmentRepository attachmentRepository,
            ITicketRepository ticketRepository,
            IFileStorageService fileStorage,
            IMapper mapper)
        {
            _attachmentRepository = attachmentRepository;
            _ticketRepository = ticketRepository;
            _fileStorage = fileStorage;
            _mapper = mapper;
        }

        private static bool CanUpload(Ticket ticket, int userId, string? role) => role switch
        {
            "Manager" => true,
            "Agent" => ticket.AssignedToUserId == userId,
            "Employee" => ticket.CreatedByUserId == userId,
            _ => false
        };

        public async Task<AttachmentUploadResult> UploadAsync(int ticketId, CreateAttachmentRequestDto request, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null || !CanUpload(ticket, requestingUserId, requestingUserRole))
                return AttachmentUploadResult.NoAccess;

            byte[] bytes;
            try
            {
                bytes = DecodeBase64(request.Content);
            }
            catch (FormatException)
            {
                return AttachmentUploadResult.MalformedContent;
            }

            if (!AttachmentValidator.Validate(bytes, request.FileName, out var contentType, out var failure))
                return failure;

            var ext = Path.GetExtension(request.FileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid():N}{ext}";

            // Create order: write the FILE first, then the DB row. If the row write
            // fails, the worst case is a harmless orphan file (no row points at it)
            // never a row pointing at a missing file.
            await _fileStorage.SaveAsync(bytes, storedName);

            await _attachmentRepository.CreateAsync(new Attachment
            {
                TicketId = ticketId,
                UploadedByUserId = requestingUserId,
                FilePath = storedName,
                FileName = request.FileName,
                ContentType = contentType,
                FileSize = bytes.Length,
                UploadedDate = DateTime.UtcNow
            });

            return AttachmentUploadResult.Created;
        }

        public async Task<ICollection<AttachmentResponseDto>?> GetForTicketAsync(int ticketId, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null || !TicketAccessPolicy.CanView(ticket, requestingUserId, requestingUserRole))
                return null;

            var attachments = await _attachmentRepository.GetByTicketIdAsync(ticketId);
            return _mapper.Map<List<AttachmentResponseDto>>(attachments);
        }

        public async Task<AttachmentDownloadDto?> GetForDownloadAsync(int ticketId, int attachmentId, int requestingUserId, string? requestingUserRole)
        {
            var ticket = await _ticketRepository.GetByIdAsync(ticketId);
            if (ticket == null || !TicketAccessPolicy.CanView(ticket, requestingUserId, requestingUserRole))
                return null;

            var attachment = await _attachmentRepository.GetByIdAsync(attachmentId);
            if (attachment == null || attachment.TicketId != ticketId)
                return null;

            var bytes = await _fileStorage.ReadAsync(attachment.FilePath);
            if (bytes == null)
                return null; // row exists but file is missing (orphaned row)

            return new AttachmentDownloadDto
            {
                Content = bytes,
                ContentType = attachment.ContentType,
                FileName = attachment.FileName
            };
        }

        // Accept a raw Base64 string or a data: URL ("data:image/png;base64,....").
        private static byte[] DecodeBase64(string content)
        {
            var comma = content.IndexOf(',');
            if (content.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma >= 0)
                content = content[(comma + 1)..];
            return Convert.FromBase64String(content);
        }
    }
}
