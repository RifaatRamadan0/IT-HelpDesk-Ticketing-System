using HelpDesk.BLL.Interfaces;
using System.IO;
using System.Threading.Tasks;

namespace HelpDesk_API.Services
{
    public class FileStorageService : IFileStorageService
    {
        private readonly string _root;

        public FileStorageService(IWebHostEnvironment env)
        {
            _root = Path.Combine(env.ContentRootPath, "Uploads", "Attachments");
        }

        public async Task SaveAsync(byte[] content, string storedFileName)
        {
            Directory.CreateDirectory(_root);

            var full = Path.Combine(_root, Path.GetFileName(storedFileName));
            await File.WriteAllBytesAsync(full, content);
        }

        public async Task<byte[]?> ReadAsync(string storedFileName)
        {
            var full = Path.Combine(_root, Path.GetFileName(storedFileName));
            if (!File.Exists(full))
                return null;
            return await File.ReadAllBytesAsync(full);
        }

        public void Delete(string storedFileName)
        {
            var full = Path.Combine(_root, Path.GetFileName(storedFileName));
            if (File.Exists(full))
                File.Delete(full);
        }
    }
}
