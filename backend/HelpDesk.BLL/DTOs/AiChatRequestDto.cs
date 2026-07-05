using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HelpDesk.BLL.DTOs
{
    public class AiChatRequestDto
    {
        [Required]
        public List<ChatTurnDto> Messages { get; set; } = new();
    }
}
