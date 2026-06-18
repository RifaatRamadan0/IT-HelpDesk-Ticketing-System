namespace HelpDesk.BLL.Common
{
    public enum AttachmentUploadResult
    {
        Created,
        NoAccess,          // caller may not upload to this ticket -> 404
        MalformedContent,  // Base64 wouldn't decode -> 400
        InvalidFileType,   // extension not on the allowlist -> 400
        FileEmpty,         // zero bytes -> 400
        FileTooLarge,      // over the size cap -> 400
        ContentMismatch    // magic bytes don't match the extension -> 400
    }
}
