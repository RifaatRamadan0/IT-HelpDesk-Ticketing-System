using System;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HelpDesk.DAL.Data
{
    // SQL Server datetime2 stores no timezone, so EF reads values back with
    // DateTime.Kind = Unspecified. Since every DateTime in this app is written as
    // UTC (DateTime.UtcNow), we stamp Kind = Utc on read. That makes System.Text.Json
    // serialize them with a trailing 'Z', so clients parse them as UTC instants
    // instead of mistaking them for local time. Store side is identity (no schema
    // change, no migration).
    public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter()
            : base(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
        {
        }
    }

    public class UtcNullableDateTimeConverter : ValueConverter<DateTime?, DateTime?>
    {
        public UtcNullableDateTimeConverter()
            : base(
                v => v,
                v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
        {
        }
    }
}
