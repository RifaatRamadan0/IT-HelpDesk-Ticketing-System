namespace HelpDesk.BLL.Common
{
    public enum DeleteAttachmentResult
    {
        Deleted,
        NotFound,        // attachment doesn't exist / not on this ticket -> 404
        NotUploader      // only the user who uploaded it may delete it -> 403
    }
}
