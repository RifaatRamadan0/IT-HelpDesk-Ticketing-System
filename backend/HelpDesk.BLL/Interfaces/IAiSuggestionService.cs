using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;

namespace HelpDesk.BLL.Interfaces
{
    public interface IAiSuggestionService
    {
        Task<(AiSuggestResult Result, AiSuggestionDto? Suggestion)> SuggestAsync(
            string title, string description);
    }
}
