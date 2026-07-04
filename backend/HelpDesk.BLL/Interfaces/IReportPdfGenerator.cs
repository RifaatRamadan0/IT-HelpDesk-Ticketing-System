using HelpDesk.BLL.DTOs;

namespace HelpDesk.BLL.Interfaces
{
    public interface IReportPdfGenerator
    {
        byte[] Generate(ReportDto report);
    }
}
