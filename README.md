# KGD.NET Loteria — React + ASP.NET Core

Aplikacja webowa do losowania nagród na spotkaniach społeczności KGD.NET.
Wizualnie nawiązuje do mechaniki otwierania skrzynek z CS:GO.

## Wymagania (dev)
- .NET 9 SDK: https://dotnet.microsoft.com/download
- Node.js 20+: https://nodejs.org

---

## Konfiguracja

Hasło dostępu jest ustawiane przez zmienną środowiskową `APP_PASSWORD`.

Skopiuj `.env.example` jako `.env` i ustaw własne hasło:
```
cp .env.example .env
# edytuj .env i zmień APP_PASSWORD
```

Domyślna wartość to `kgd2024` (z `appsettings.json`).

---

## Uruchomienie (development)

### Terminal 1 — serwer ASP.NET
```bash
cd server
dotnet run
# serwer startuje na http://localhost:5000
```

### Terminal 2 — klient React
```bash
cd client
npm install
npm run dev
# otwórz http://localhost:5173
```

---

## Build produkcyjny (jedna aplikacja)

```bash
cd client
npm install
npm run build        # buduje React do server/wwwroot/

cd ../server
dotnet run           # serwuje i API i frontend z http://localhost:5000
```

---

## Docker

### Budowanie obrazu lokalnie

```bash
docker build -t kgdnet/loteria:latest .
docker run -p 8080:8080 -e APP_PASSWORD=mojehaslo kgdnet/loteria:latest
```

Aplikacja dostępna pod http://localhost:8080.

### Gotowy obraz (docker-compose)

Skopiuj `docker-compose.example.yml` jako `docker-compose.yml`, dostosuj hasło i uruchom:

```bash
cp docker-compose.example.yml docker-compose.yml
# edytuj docker-compose.yml → APP_PASSWORD
docker compose up -d
```

---

## Obsługa

1. Wpisz hasło na ekranie logowania
2. Kliknij "WCZYTAJ PLIK" → wybierz `.xlsx` z ankiety
3. Kliknij "LOSUJ" (lub `Spacja`)
4. Karty kręcą się i zatrzymują na zwycięzcy
5. `R` → losuj ponownie | `Esc` → zamknij panel
