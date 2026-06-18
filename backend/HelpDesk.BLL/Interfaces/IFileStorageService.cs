using System.Threading.Tasks;

namespace HelpDesk.BLL.Interfaces
{
    public interface IFileStorageService
    {
        Task SaveAsync(byte[] content, string storedFileName);
        Task<byte[]?> ReadAsync(string storedFileName);
        Task DeleteAsync(string storedFileName);
    }
}
