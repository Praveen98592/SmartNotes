using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.AI;
using static SmartNotesApi.DTOs.AiDtos;

public record AiProcessRequest(string Content, string Mode = "summarize");

namespace SmartNotesApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController: ControllerBase
    {
        private readonly IChatClient _chatClient;
        private readonly ILogger<AiController> _logger;

        public AiController(IChatClient chatClient, ILogger<AiController> logger)
        {
            _chatClient = chatClient;
            _logger = logger;
        }


        [HttpPost("process")]
        public async Task<IActionResult>ProcessContent([FromBody] AiProcessRequest request, CancellationToken ct)            
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Content cannot be empty." });
            }

            var mode = request.Mode?.ToLowerInvariant();

            // 1. Tightly constrained system instructions
            var systemPrompt = mode switch
            {
                "action_items" =>
                    "Extract tasks from the text into a concise markdown checklist (- [ ]). Keep each bullet under 10 words.",

                "qa" =>
                    "You are a concise workspace copilot. Answer the query or explain the topic directly in MAXIMUM 3 to 4 short bullet points or under 120 words. Never write introductory fluff or long essays.",

                _ => // summarize
                    "Provide a brief executive summary: 1 key takeaway sentence followed by 2-3 short bullet points. Max 100 words."
            };

            var messages = new List<ChatMessage>
            {
                new (ChatRole.System, systemPrompt),
                new (ChatRole.User, request.Content)
            };

            // Cap output tokens so CPU inference finishes quickly
            var options = new ChatOptions
            {
                MaxOutputTokens = 220
            };


            var response = await _chatClient.GetResponseAsync(messages, cancellationToken: ct);
            return Ok(new { result = response.Text ?? string.Empty });

        }

    }
}
