using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using OllamaSharp;
using SmartNotesApi.Data;

var builder = WebApplication.CreateBuilder(args);

// Register Controllers and OpenAPI/Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<NotesDbContext>(options =>
options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));


// Configure AI Service via Microsoft.Extensions.AI abstraction
var aiEndpoint = new Uri(builder.Configuration["AiSettings:Endpoint"] ?? "http://localhost:11434");
var aiModel = builder.Configuration["AiSettings:Model"] ?? "llama3.2";

// 1. Create an HttpClient with an extended 5-minute timeout (default is 100s)
var ollamaHttpClient = new HttpClient
{
    BaseAddress = aiEndpoint,
    Timeout = TimeSpan.FromMinutes(5)
};

// 2. Pass the custom HttpClient into OllamaApiClient
// Register Ollama client as IChatClient (enables swappable providers in production)
builder.Services.AddChatClient(new OllamaApiClient(aiEndpoint, aiModel));


// Enable CORS so our React frontend can communicate with the API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});


var app = builder.Build();

// Creates the SmartNotesDb database and Notes table automatically if they do not exist. No need for Migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NotesDbContext>();
    db.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

//app.UseRouting(); //TEST

// Place CORS middleware here:
app.UseCors("AllowReactApp");

app.UseAuthorization();

// Map controller routes
app.MapControllers();

app.Run();


