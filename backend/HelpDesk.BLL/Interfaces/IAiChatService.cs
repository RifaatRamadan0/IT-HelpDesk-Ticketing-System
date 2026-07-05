using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;

namespace HelpDesk.BLL.Interfaces
{
    public interface IAiChatService
    {
        Task<(AiSuggestResult Result, AiChatResponseDto? Response)> ContinueAsync(
            IReadOnlyList<ChatTurnDto> messages);
    }
}
