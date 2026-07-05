namespace HelpDesk.BLL.DTOs
{
    public class AiChatResponseDto
    {
        public string Status { get; set; } = "gathering";
        public string Message { get; set; } = string.Empty;
        public AiTicketDraftDto? Draft { get; set; }
    }
}
