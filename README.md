# KGD.NET Loteria — React + ASP.NET Core

## Wymagania
- .NET 9 SDK: https://dotnet.microsoft.com/download
- Node.js 18+: https://nodejs.org

---

## Uruchomienie (development)

### Terminal 1 — serwer ASP.NET
```
cd server
dotnet run
# serwer startuje na http://localhost:5000
```

### Terminal 2 — klient React
```
cd client
npm install
npm run dev
# otwórz http://localhost:5173
```

---

## Build produkcyjny (jedna aplikacja)

```
cd client
npm install
npm run build        <- buduje React do server/wwwroot/

cd ../server
dotnet run           <- serwuje i API i frontend z http://localhost:5000
```

Obsługa:
1. Kliknij "WCZYTAJ PLIK" -> wybierz .xlsx z ankiety
2. Kliknij "LOSUJ" (lub SPACJA)
3. Karty krecą się i bardzo wolno zatrzymują na zwycięzcy
4. 2s pauzy z rozświetleniem karty, potem panel + confetti
5. R -> losuj ponownie | ESC -> zamknij panel
