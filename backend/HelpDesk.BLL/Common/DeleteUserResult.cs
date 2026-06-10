namespace HelpDesk.BLL.Common
{
    // Distinct outcomes of a delete attempt so the controller can map each to the
    // right HTTP status instead of collapsing them into a single bool.
    public enum DeleteUserResult
    {
        Deleted,
        NotFound,
        HasRelatedData
    }
}
