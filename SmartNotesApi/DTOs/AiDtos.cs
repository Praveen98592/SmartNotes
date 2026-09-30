namespace SmartNotesApi.DTOs
{
    public class AiDtos
    {
        public record SummarizeRequest(string Content);

        public record SummarizeResponse(string Summary);
    }
}
