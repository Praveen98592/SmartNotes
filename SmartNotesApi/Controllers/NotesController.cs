using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using SmartNotesApi.Data;
using SmartNotesApi.Models;

namespace SmartNotesApi.Controllers
{
    [ApiController]
    [Route("api/[Controller]")]
    public class NotesController : ControllerBase
    {
        private readonly NotesDbContext _db;
        private readonly IChatClient _chatClient;

        public NotesController(NotesDbContext db, IChatClient chatClient)
        {
            _db = db;
            _chatClient = chatClient;
        }

        //1. Get: api/notes (fetchNotes)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Note>>> GetNotes()
        {
            var notes = await _db.Notes.OrderByDescending(n => n.CreatedAt).ToListAsync();
            return Ok(notes);
        }

        // POST: /api/notes
        [HttpPost]
        public async Task<ActionResult<Note>> SaveNote([FromBody] Note note, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(note.Content))
            {
                return BadRequest(new { message = "Content cannot be empty." });
            }

            note.CreatedAt = DateTime.UtcNow;

            // Auto-generate title using Llama 3.2 if left blank by the user
            if (string.IsNullOrWhiteSpace(note.Title))
            {
                try
                {
                    var promptSnippet = note.Content.Length > 500 ? note.Content[..500] : note.Content;
                    var titlePrompt = $"Generate a concise title of 3 to 5 words for the following text. Respond ONLY with the title text and no quotation marks, punctuation, or preamble:\n\n{promptSnippet}";

                    var aiResponse = await _chatClient.GetResponseAsync(titlePrompt, cancellationToken: ct);
                    var rawTitle = aiResponse.Text.Trim().Trim('"', '\'', '.', '\n', '\r');

                    note.Title = string.IsNullOrWhiteSpace(rawTitle)
                        ? (note.Content.Length > 35 ? note.Content[..35] + "..." : note.Content)
                        : rawTitle;
                }
                catch
                {
                    // Fallback to substring in case of timeout or model error
                    note.Title = note.Content.Length > 35 ? note.Content[..35] + "..." : note.Content;
                }
            }

            _db.Notes.Add(note);
            await _db.SaveChangesAsync(ct);

            return Ok(note);
        }

        // 3. DELETE: /api/notes/{id} (deleteNoteFromDb)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            var note = await _db.Notes.FindAsync(id);

            if (note == null)
            {
                return NotFound(new { message = $"Note with id {id} not found" });
            }

            _db.Notes.Remove(note);
            await _db.SaveChangesAsync();

            return NoContent();
        }

    }
}
