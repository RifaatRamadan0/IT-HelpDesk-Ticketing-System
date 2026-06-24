using System.ComponentModel.DataAnnotations;

namespace HelpDesk.BLL.DTOs
{
    public class AiSuggestRequestDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;
    }
}
