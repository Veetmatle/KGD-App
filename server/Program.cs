using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Allow APP_PASSWORD env var to override appsettings.json
builder.Configuration.AddEnvironmentVariables();

ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

var app = builder.Build();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// ── API ──────────────────────────────────────────────────────────────────────

app.MapPost("/api/auth", (AuthRequest req, IConfiguration config) =>
{
    var expected = config["APP_PASSWORD"] ?? "kgd2024";
    return req.Password == expected ? Results.Ok() : Results.Unauthorized();
});

app.MapPost("/api/upload", async (IFormFile file) =>
{
    using var stream = file.OpenReadStream();
    using var pkg    = new ExcelPackage(stream);
    var sheet = pkg.Workbook.Worksheets[0];

    // znajdź indeksy kolumn po nagłówku
    int idCol = -1, nickCol = -1, mailCol = -1;
    int cols = sheet.Dimension?.Columns ?? 0;
    for (int c = 1; c <= cols; c++)
{
        var h = sheet.Cells[1, c].Text.Trim();
        if (h == "ID") idCol = c;
        else if (h.Contains("nick")) nickCol = c;
        else if (h.Contains("Email") || h.Contains("mail")) mailCol = c;
    }

    if (idCol < 0) return Results.BadRequest("Nie znaleziono kolumny ID");

    var participants = new List<object>();
    int rows = sheet.Dimension?.Rows ?? 0;
    for (int r = 2; r <= rows; r++)
    {
        var idVal = sheet.Cells[r, idCol].Text.Trim();
        if (!int.TryParse(idVal, out int id)) continue;

        var nick = nickCol > 0 ? sheet.Cells[r, nickCol].Text.Trim() : "";
        var mail = mailCol > 0 ? sheet.Cells[r, mailCol].Text.Trim() : "";
        if (string.IsNullOrWhiteSpace(nick) || nick == "nan") nick = $"Uczestnik #{id}";
        if (mail is "nan" or "NaN") mail = "";

        participants.Add(new { id, nick, mail });
    }

    return Results.Ok(participants);
})
.DisableAntiforgery();

app.MapFallbackToFile("index.html");
app.Run();

record AuthRequest(string Password);
