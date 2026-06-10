using System.ComponentModel.DataAnnotations;

namespace HelpDesk.BLL.DTOs
{
    // Email is intentionally not editable here (it's the login identity); only
    // name, role, and active state can change.
    public class UpdateUserRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public int RoleId { get; set; }

        public bool IsActive { get; set; }
    }
}
