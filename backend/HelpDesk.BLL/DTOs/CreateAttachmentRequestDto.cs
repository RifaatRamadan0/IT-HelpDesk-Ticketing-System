using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.DTOs
{
    public class CreateAttachmentRequestDto
    {
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        // The file bytes, Base64-encoded (a raw string or a data: URL)
        [Required]
        public string Content { get; set; } = string.Empty;
    }
}
