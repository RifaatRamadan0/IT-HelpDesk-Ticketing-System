using System.Globalization;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HelpDesk.BLL.Services
{
    public class ReportPdfGenerator : IReportPdfGenerator
    {
        private static readonly Color Accent = Color.FromHex("#2f6bed");
        private static readonly Color HeaderBg = Color.FromHex("#f1f5fb");
        private static readonly Color Line = Color.FromHex("#e2e6ee");
        private static readonly Color Muted = Color.FromHex("#667085");

        public byte[] Generate(ReportDto report)
        {
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Black));

                    page.Header().Element(h => ComposeHeader(h, report));
                    page.Content().PaddingTop(16).Column(col =>
                    {
                        col.Spacing(18);
                        ComposeKpis(col, report);
                        ComposeTrend(col, report);
                        ComposeBreakdowns(col, report);
                        ComposeAgents(col, report);
                    });

                    page.Footer().AlignCenter().Text(text =>
                    {
                        text.DefaultTextStyle(x => x.FontSize(8).FontColor(Muted));
                        text.Span("Generated ");
                        text.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm"));
                        text.Span("  •  Page ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                    });
                });
            });

            return document.GeneratePdf();
        }

        private static void ComposeHeader(IContainer container, ReportDto report)
        {
            container.Column(col =>
            {
                col.Item().Text("Help Desk Report").FontSize(20).SemiBold().FontColor(Accent);
                col.Item().Text($"{report.From:MMM d, yyyy} — {report.To.AddDays(-1):MMM d, yyyy}")
                    .FontSize(11).FontColor(Muted);
            });
        }

        private static void ComposeKpis(ColumnDescriptor col, ReportDto report)
        {
            var escalationRate = report.Created > 0
                ? (double)report.Escalated / report.Created * 100
                : 0;
            var backlogDelta = report.Created - report.Resolved;

            var cards = new (string Label, string Value, string Sub)[]
            {
                ("Created", report.Created.ToString(), ""),
                ("Resolved", report.Resolved.ToString(), ""),
                ("Avg resolution", FormatHours(report.AvgResolutionHours), "creation → resolved"),
                ("Avg handling", FormatDuration(report.AvgHandlingSeconds), "active work time"),
                ("Escalation rate", $"{escalationRate:0}%", $"{report.Escalated} escalated"),
                ("Net backlog", $"{(backlogDelta > 0 ? "+" : "")}{backlogDelta}",
                    backlogDelta > 0 ? "backlog grew" : backlogDelta < 0 ? "backlog shrank" : "no change"),
            };

            col.Item().Grid(grid =>
            {
                grid.Columns(3);
                grid.Spacing(10);
                foreach (var card in cards)
                {
                    grid.Item().Border(1).BorderColor(Line).Padding(10).Column(c =>
                    {
                        c.Item().Text(card.Label).FontSize(9).FontColor(Muted);
                        c.Item().Text(card.Value).FontSize(16).SemiBold();
                        if (!string.IsNullOrEmpty(card.Sub))
                            c.Item().Text(card.Sub).FontSize(8).FontColor(Muted);
                    });
                }
            });
        }

        private static void ComposeTrend(ColumnDescriptor col, ReportDto report)
        {
            col.Item().Text("Created vs resolved").FontSize(13).SemiBold();

            if (report.Trend.Count == 0)
            {
                col.Item().Text("No activity in this period.").FontColor(Muted);
                return;
            }

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn();
                    c.RelativeColumn();
                });

                table.Header(header =>
                {
                    HeaderCell(header, "Date");
                    HeaderCellRight(header, "Created");
                    HeaderCellRight(header, "Resolved");
                });

                foreach (var point in report.Trend)
                {
                    BodyCell(table, point.Date.ToString("MMM d", CultureInfo.InvariantCulture));
                    BodyCellRight(table, point.Created.ToString());
                    BodyCellRight(table, point.Resolved.ToString());
                }
            });
        }

        private static void ComposeBreakdowns(ColumnDescriptor col, ReportDto report)
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Tickets by category").FontSize(13).SemiBold();
                    c.Item().PaddingTop(4).Element(e => KeyValueTable(e, report.ByCategory));
                });
                row.ConstantItem(20);
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("By priority").FontSize(13).SemiBold();
                    c.Item().PaddingTop(4).Element(e => KeyValueTable(e, report.ByPriority));
                });
            });
        }

        private static void KeyValueTable(IContainer container, IDictionary<string, int> data)
        {
            if (data.Count == 0)
            {
                container.Text("No data.").FontColor(Muted);
                return;
            }

            container.Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(2);
                    c.RelativeColumn();
                });
                foreach (var pair in data)
                {
                    BodyCell(table, pair.Key);
                    BodyCellRight(table, pair.Value.ToString());
                }
            });
        }

        private static void ComposeAgents(ColumnDescriptor col, ReportDto report)
        {
            col.Item().Text("Agent performance").FontSize(13).SemiBold();

            if (report.ByAgent.Count == 0)
            {
                col.Item().Text("No tickets were resolved in this period.").FontColor(Muted);
                return;
            }

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.RelativeColumn(3);
                    c.RelativeColumn();
                    c.RelativeColumn();
                    c.RelativeColumn();
                });

                table.Header(header =>
                {
                    HeaderCell(header, "Agent");
                    HeaderCellRight(header, "Resolved");
                    HeaderCellRight(header, "Time logged");
                    HeaderCellRight(header, "Avg resolution");
                });

                foreach (var agent in report.ByAgent)
                {
                    BodyCell(table, agent.Name);
                    BodyCellRight(table, agent.Resolved.ToString());
                    BodyCellRight(table, FormatDuration(agent.TimeSpentSeconds));
                    BodyCellRight(table, FormatHours(agent.AvgResolutionHours));
                }
            });
        }

        private static void HeaderCell(TableCellDescriptor header, string text) =>
            header.Cell().Background(HeaderBg).Padding(6).Text(text).SemiBold();

        private static void HeaderCellRight(TableCellDescriptor header, string text) =>
            header.Cell().Background(HeaderBg).Padding(6).AlignRight().Text(text).SemiBold();

        private static void BodyCell(TableDescriptor table, string text) =>
            table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text(text);

        private static void BodyCellRight(TableDescriptor table, string text) =>
            table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).AlignRight().Text(text);

        private static string FormatHours(double? hours) =>
            hours == null ? "—" : $"{hours.Value:0.0}h";

        private static string FormatDuration(double? seconds)
        {
            if (seconds == null || seconds <= 0) return "—";
            return FormatDuration((long)Math.Round(seconds.Value));
        }

        private static string FormatDuration(long seconds)
        {
            if (seconds <= 0) return "—";
            var total = seconds;
            var h = total / 3600;
            var m = total % 3600 / 60;
            if (h > 0) return m > 0 ? $"{h}h {m}m" : $"{h}h";
            if (m > 0) return $"{m}m";
            return $"{total}s";
        }
    }
}
