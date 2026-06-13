using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HelpDesk.BLL.DTOs
{
    public class AssignTicketRequestDto
    {
        [Required]
        public int AgentUserId { get; set; }
    }
}
