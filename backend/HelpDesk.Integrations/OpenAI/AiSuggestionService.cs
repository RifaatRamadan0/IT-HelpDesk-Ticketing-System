using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using Microsoft.Extensions.Configuration;
using OpenAI.Chat;
using System.ClientModel;
using System.Text.Json;

namespace HelpDesk.Integrations.OpenAI
{
    public class AiSuggestionService : IAiSuggestionService
    {
        private readonly ICategoryService _categoryService;
        private readonly IPriorityService _priorityService;
        private readonly string? _apiKey;
        private readonly string _model;

        public AiSuggestionService(
            IConfiguration configuration,
            ICategoryService categoryService,
            IPriorityService priorityService)
        {
            _categoryService = categoryService;
            _priorityService = priorityService;
            _apiKey = configuration["OpenAI:ApiKey"];
            _model = configuration["OpenAI:Model"] ?? "gpt-5.4-nano";
        }

        public async Task<(AiSuggestResult Result, AiSuggestionDto? Suggestion)> SuggestAsync(
            string title, string description)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
                return (AiSuggestResult.NotConfigured, null);

            var categories = (await _categoryService.GetAllAsync()).Select(c => c.Name).ToList();
            var priorities = (await _priorityService.GetAllAsync()).Select(p => p.Name).ToList();

            try
            {
                var client = new ChatClient(_model, new ApiKeyCredential(_apiKey));

                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(BuildSystemPrompt(categories, priorities)),
                    new UserChatMessage($"Title: {title}\nDescription: {description}")
                };

                var options = new ChatCompletionOptions
                {
                    Temperature = 0,
                    ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
                };

                ChatCompletion completion = await client.CompleteChatAsync(messages, options);

                var content = completion.Content.Count > 0 ? completion.Content[0].Text : null;
                if (string.IsNullOrWhiteSpace(content))
                    return (AiSuggestResult.UpstreamError, null);

                using var parsed = JsonDocument.Parse(content);
                var root = parsed.RootElement;

                var rawCategory = GetStringProp(root, "category");
                var rawPriority = GetStringProp(root, "priority");

                var suggestion = new AiSuggestionDto
                {
                    CategoryName = MatchToList(rawCategory, categories) ?? rawCategory?.Trim() ?? string.Empty,
                    PriorityName = MatchToList(rawPriority, priorities) ?? rawPriority?.Trim() ?? string.Empty
                };

                return (AiSuggestResult.Success, suggestion);
            }
            catch (Exception)
            {
                return (AiSuggestResult.UpstreamError, null);
            }
        }

        private static string BuildSystemPrompt(
            IReadOnlyList<string> categories, IReadOnlyList<string> priorities) =>
            "You are an IT help-desk triage assistant. Given a ticket's title and " +
            "description, choose the single best category and the single best priority. " +
            "You must pick the category from this exact list: " + string.Join(", ", categories) + ". " +
            "You must pick the priority from this exact list: " + string.Join(", ", priorities) + ". " +
            "Respond ONLY with JSON of the form {\"category\": \"<one of the categories>\", " +
            "\"priority\": \"<one of the priorities>\"}.";

        private static string? GetStringProp(JsonElement element, string name)
            => element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String
                ? prop.GetString()
                : null;

        private static string? MatchToList(string? value, IReadOnlyList<string> options)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;

            return options.FirstOrDefault(o =>
                string.Equals(o, value.Trim(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
