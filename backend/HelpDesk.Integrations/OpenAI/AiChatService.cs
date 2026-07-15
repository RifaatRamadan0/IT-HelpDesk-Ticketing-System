using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using Microsoft.Extensions.Configuration;
using OpenAI.Chat;
using System.ClientModel;
using System.Text.Json;

namespace HelpDesk.Integrations.OpenAI
{
    public class AiChatService : IAiChatService
    {
        private readonly ICategoryService _categoryService;
        private readonly IPriorityService _priorityService;
        private readonly string? _apiKey;
        private readonly string _model;

        private const int MaxTurns = 30;
        private const int MaxTotalChars = 12000;

        public AiChatService(
            IConfiguration configuration,
            ICategoryService categoryService,
            IPriorityService priorityService)
        {
            _categoryService = categoryService;
            _priorityService = priorityService;
            _apiKey = configuration["OpenAI:ApiKey"];
            _model = configuration["OpenAI:Model"] ?? "gpt-5.4-nano";
        }

        public async Task<(AiSuggestResult Result, AiChatResponseDto? Response)> ContinueAsync(
            IReadOnlyList<ChatTurnDto> messages)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
                return (AiSuggestResult.NotConfigured, null);

            var turns = SanitizeTurns(messages);
            if (turns.Count == 0)
                return (AiSuggestResult.UpstreamError, null);

            var categories = (await _categoryService.GetAllAsync()).ToList();
            var priorities = (await _priorityService.GetAllAsync()).ToList();

            try
            {
                var client = new ChatClient(_model, new ApiKeyCredential(_apiKey));

                var chatMessages = new List<ChatMessage>
                {
                    new SystemChatMessage(BuildSystemPrompt(
                        categories.Select(c => c.Name).ToList(),
                        priorities.Select(p => p.Name).ToList()))
                };

                foreach (var turn in turns)
                {
                    chatMessages.Add(turn.Role == "assistant"
                        ? new AssistantChatMessage(turn.Content)
                        : new UserChatMessage(turn.Content));
                }

                var options = new ChatCompletionOptions
                {
                    Temperature = 0,
                    ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
                };

                ChatCompletion completion = await client.CompleteChatAsync(chatMessages, options);

                var content = completion.Content.Count > 0 ? completion.Content[0].Text : null;
                if (string.IsNullOrWhiteSpace(content))
                    return (AiSuggestResult.UpstreamError, null);

                var response = ParseEnvelope(content, categories, priorities);
                return (AiSuggestResult.Success, response);
            }
            catch (Exception)
            {
                return (AiSuggestResult.UpstreamError, null);
            }
        }

        private static List<ChatTurnDto> SanitizeTurns(IReadOnlyList<ChatTurnDto> messages)
        {
            var cleaned = messages
                .Where(m => m != null && !string.IsNullOrWhiteSpace(m.Content))
                .Select(m => new ChatTurnDto
                {
                    Role = string.Equals(m.Role, "assistant", StringComparison.OrdinalIgnoreCase)
                        ? "assistant" : "user",
                    Content = m.Content.Trim()
                })
                .ToList();

            if (cleaned.Count > MaxTurns)
                cleaned = cleaned.Skip(cleaned.Count - MaxTurns).ToList();

            while (cleaned.Count > 0 && cleaned.Sum(t => t.Content.Length) > MaxTotalChars)
                cleaned.RemoveAt(0);

            return cleaned;
        }

        private static AiChatResponseDto ParseEnvelope(
            string content,
            IReadOnlyList<CategoryDto> categories,
            IReadOnlyList<PriorityDto> priorities)
        {
            using var parsed = JsonDocument.Parse(content);
            var root = parsed.RootElement;

            var status = GetStringProp(root, "status")?.Trim().ToLowerInvariant();
            var message = GetStringProp(root, "message") ?? string.Empty;

            if (status != "ready")
                return new AiChatResponseDto { Status = "gathering", Message = message };

            if (!root.TryGetProperty("draft", out var draftEl) ||
                draftEl.ValueKind != JsonValueKind.Object)
                return new AiChatResponseDto { Status = "gathering", Message = message };

            var category = categories.FirstOrDefault(c =>
                string.Equals(c.Name, GetStringProp(draftEl, "category")?.Trim(),
                    StringComparison.OrdinalIgnoreCase));
            var priority = priorities.FirstOrDefault(p =>
                string.Equals(p.Name, GetStringProp(draftEl, "priority")?.Trim(),
                    StringComparison.OrdinalIgnoreCase));

            var title = GetStringProp(draftEl, "title")?.Trim();
            var description = GetStringProp(draftEl, "description")?.Trim();

            if (category == null || priority == null ||
                string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(description))
            {
                return new AiChatResponseDto
                {
                    Status = "gathering",
                    Message = string.IsNullOrWhiteSpace(message)
                        ? "I still need a bit more detail before I can file this ticket."
                        : message
                };
            }

            return new AiChatResponseDto
            {
                Status = "ready",
                Message = message,
                Draft = new AiTicketDraftDto
                {
                    Title = title,
                    Description = description,
                    CategoryId = category.Id,
                    CategoryName = category.Name,
                    PriorityId = priority.Id,
                    PriorityName = priority.Name
                }
            };
        }

        private static string BuildSystemPrompt(
            IReadOnlyList<string> categories, IReadOnlyList<string> priorities) =>
            "You are an IT help-desk intake assistant. Your job is to help an employee open " +
            "a support ticket with four fields: a short Title, a Description of the problem, " +
            "a Category, and a Priority. " +
            "INFER as much as you can from what the employee has already written before asking " +
            "anything. From a single description you can usually derive the Title yourself, use " +
            "their own words as the Description, and pick the most likely Category. Do NOT ask " +
            "the user to supply or confirm a field you can reasonably infer. In particular, " +
            "always compose the Title yourself and never ask them for one. " +
            "Only ask about details you genuinely cannot determine or that are truly ambiguous, " +
            "and when you must ask, put ALL your open questions in ONE message rather than one " +
            "question per turn. Keep it brief and friendly. " +
            "Default the Priority to a middle/normal level unless the user signals urgency or " +
            "impact (e.g. work-blocking, many people affected, a deadline), in which case raise " +
            "it accordingly; only ask about priority if you truly cannot judge. " +
            "Do NOT troubleshoot, give IT advice, or answer unrelated questions; if asked, " +
            "politely steer back to describing the issue so you can log it. " +
            "The Category MUST be exactly one of: " + string.Join(", ", categories) + ". " +
            "The Priority MUST be exactly one of: " + string.Join(", ", priorities) + ". " +
            "If the user's wording genuinely doesn't map to one of those, ask them to choose. " +
            "As soon as you have reasonable values for all four fields, do NOT keep asking — go " +
            "straight to status \"ready\" and use the message to state the full draft you're " +
            "about to file (title, category, priority, and a one-line description) and ask them " +
            "to confirm or adjust. " +
            "Respond ONLY with a JSON object of this exact shape and nothing else:\n" +
            "{\"status\":\"gathering\"|\"ready\", \"message\":\"<your reply to the user>\", " +
            "\"draft\": null | {\"title\":\"...\",\"description\":\"...\"," +
            "\"category\":\"<one of the categories>\",\"priority\":\"<one of the priorities>\"}}\n" +
            "While you still genuinely need information, use status \"gathering\" and draft null. " +
            "Once you have all four fields, use status \"ready\", put the confirmation summary in " +
            "message, and fill draft.";

        private static string? GetStringProp(JsonElement element, string name)
            => element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String
                ? prop.GetString()
                : null;
    }
}
