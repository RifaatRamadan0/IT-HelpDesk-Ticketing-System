using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace HelpDesk.BLL.Common
{
    // Validates an uploaded file's bytes, layered cheapest-check-first:
    //   1. extension must be on the allowlist (cheap pre-filter + controls serving)
    //   2. size within the cap
    //   3. magic bytes must match the claimed type (content, not label)
    // Returns the server-decided ContentType (from the allowlist, never trusted
    // from the client). Text types (.txt/.log/.csv) have no signature, so for
    // those the allowlist is the gate.
    public static class AttachmentValidator
    {
        public const long MaxBytes = 5 * 1024 * 1024; // 5 MB

        private sealed class AllowedType
        {
            public string ContentType { get; init; } = string.Empty;
            // Any one matching signature passes; empty = no magic-byte check.
            public byte[][] Signatures { get; init; } = Array.Empty<byte[]>();
        }

        private static readonly Dictionary<string, AllowedType> Allowed =
            new(StringComparer.OrdinalIgnoreCase)
            {
                [".png"] = new() { ContentType = "image/png", Signatures = new[] { new byte[] { 0x89, 0x50, 0x4E, 0x47 } } },
                [".jpg"] = new() { ContentType = "image/jpeg", Signatures = new[] { new byte[] { 0xFF, 0xD8, 0xFF } } },
                [".jpeg"] = new() { ContentType = "image/jpeg", Signatures = new[] { new byte[] { 0xFF, 0xD8, 0xFF } } },
                [".gif"] = new() { ContentType = "image/gif", Signatures = new[] { Encoding.ASCII.GetBytes("GIF87a"), Encoding.ASCII.GetBytes("GIF89a") } },
                [".pdf"] = new() { ContentType = "application/pdf", Signatures = new[] { Encoding.ASCII.GetBytes("%PDF") } },
                [".zip"] = new() { ContentType = "application/zip", Signatures = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } } },
                [".docx"] = new() { ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Signatures = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } } },
                [".xlsx"] = new() { ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Signatures = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } } },
                // Plain-text formats have no signature.
                [".txt"] = new() { ContentType = "text/plain" },
                [".log"] = new() { ContentType = "text/plain" },
                [".csv"] = new() { ContentType = "text/csv" },
            };

        // Returns true and the server-decided ContentType when valid; otherwise
        // false and the specific failure reason (the controller owns the message).
        public static bool Validate(byte[] bytes, string fileName, out string contentType, out AttachmentUploadResult failure)
        {
            contentType = string.Empty;
            failure = AttachmentUploadResult.InvalidFileType;

            var ext = Path.GetExtension(fileName);
            if (string.IsNullOrEmpty(ext) || !Allowed.TryGetValue(ext, out var type))
            {
                failure = AttachmentUploadResult.InvalidFileType;
                return false;
            }

            if (bytes.Length == 0)
            {
                failure = AttachmentUploadResult.FileEmpty;
                return false;
            }

            if (bytes.Length > MaxBytes)
            {
                failure = AttachmentUploadResult.FileTooLarge;
                return false;
            }

            if (type.Signatures.Length > 0 && !type.Signatures.Any(sig => StartsWith(bytes, sig)))
            {
                failure = AttachmentUploadResult.ContentMismatch;
                return false;
            }

            contentType = type.ContentType;
            return true;
        }

        private static bool StartsWith(byte[] bytes, byte[] signature)
        {
            if (bytes.Length < signature.Length)
                return false;
            for (int i = 0; i < signature.Length; i++)
                if (bytes[i] != signature[i])
                    return false;
            return true;
        }
    }
}
