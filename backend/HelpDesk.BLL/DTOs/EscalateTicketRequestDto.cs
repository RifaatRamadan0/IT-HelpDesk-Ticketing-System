using System.ComponentModel.DataAnnotations;

namespace HelpDesk.BLL.DTOs
{
    public class EscalateTicketRequestDto
    {
        [Required]
        [MaxLength(2000)]
        public string Reason { get; set; } = string.Empty;
    }
}
