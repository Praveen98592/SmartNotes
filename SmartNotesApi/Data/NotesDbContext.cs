using Microsoft.EntityFrameworkCore;
using SmartNotesApi.Models;

namespace SmartNotesApi.Data
{
    public class NotesDbContext : DbContext
    {
        public NotesDbContext(DbContextOptions<NotesDbContext> options) : base(options)
        {

        }

        public DbSet<Note> Notes => Set<Note>();
    }
}
