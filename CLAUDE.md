# KGD Loteria — CLAUDE.md

## Czym jest projekt

Aplikacja webowa do losowania nagród na spotkaniach społeczności **KGD.NET**.
Wizualnie nawiązuje do mechaniki otwierania skrzynek z CS:GO — poziomy pasek z kartami uczestników przesuwa się i zatrzymuje na wylosowanym zwycięzcy.

---

## Architektura

```
KgdLoteria/
├── client/         # Frontend — React 18 + TypeScript + Vite
├── server/         # Backend  — ASP.NET Core (.NET 9), minimal API
├── .env            # Zmienne środowiskowe (gitignored) — APP_PASSWORD
├── .env.example    # Przykład pliku .env (tracked)
└── Dockerfile      # Multi-stage build (frontend → backend → runtime)
```

Backend serwuje frontend jako pliki statyczne (`wwwroot/`). W trybie dev frontend działa na porcie Vite, a backend na osobnym porcie z CORS AllowAny.

---

## Konfiguracja hasła

Hasło dostępu pochodzi z `APP_PASSWORD`:
1. zmienna środowiskowa (Docker, produkcja) — najwyższy priorytet
2. `server/appsettings.json` — fallback dla dev (domyślnie `kgd2024`)

Plik `.env` w katalogu głównym (gitignored) jest odczytywany przez Docker Compose. Lokalnie wystarczy ustawić `APP_PASSWORD` w env lub zostawić domyślną wartość z `appsettings.json`.

---

## Backend (`server/`)

**Jeden plik:** `Program.cs` — minimal API.

### Endpointy

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/auth` | Przyjmuje `{ password }` w JSON, waliduje względem `APP_PASSWORD`, zwraca 200 lub 401 |
| `POST` | `/api/upload` | Przyjmuje plik `.xlsx`/`.xls`, parsuje arkusz i zwraca JSON z listą uczestników |

### Parsowanie Excela (EPPlus)

Parser szuka nagłówków w pierwszym wierszu:
- kolumna `ID` — liczba całkowita, identyfikator uczestnika
- kolumna zawierająca `nick` — pseudonim
- kolumna zawierająca `Email` lub `mail` — adres e-mail

Wartości `nan`/`NaN` są traktowane jako puste. Jeśli brak nicku — fallback `Uczestnik #ID`.

### Zależności NuGet
- `EPPlus` — odczyt plików Excel (licencja NonCommercial)

---

## Frontend (`client/`)

### Struktura

```
src/
├── App.tsx                    # Główny komponent — layout, upload, klawiatura
├── hooks/
│   └── useLottery.ts          # Logika animacji / stany losowania
├── components/
│   ├── LoginScreen.tsx        # Ekran logowania — POST /api/auth
│   ├── ParticipantCard.tsx    # Karta uczestnika na taśmie
│   ├── ParticipantsSidebar.tsx# Panel boczny z listą uczestników
│   ├── WinnerPanel.tsx        # Modal ze zwycięzcą (animowany)
│   └── Confetti.tsx           # Efekt konfetti po losowaniu
└── types/
    └── index.ts               # Participant, LotteryState
```

### Stany maszyny stanów losowania (`LotteryState`)

```
idle → spinning → slowing → paused → revealing → done
                                                  ↓
                                               (reset → idle)
```

- **idle** — taśma przesuwa się wolno w pętli (animacja idle)
- **spinning** — pełna prędkość (5000 px/s)
- **slowing** — deceleracja (mnożnik 0.978/klatkę) gdy dystans < 14 slotów
- **paused** — zatrzymanie na zwycięzcy, krótki glow (150 ms)
- **revealing** — animowane wjazd panelu zwycięzcy + konfetti
- **done** — panel widoczny, czeka na reset

### Skróty klawiszowe

| Klawisz | Akcja |
|---------|-------|
| `Spacja` / `Enter` | Losuj (gdy idle i są uczestnicy) |
| `R` | Losuj ponownie / losuj (idle lub done) |
| `Escape` | Zamknij panel zwycięzcy |

### Palety kolorów kart

6 palet przypisanych cyklicznie wg `id % 6`:
niebieski, fioletowy, turkusowy, różowy, zielony, złoty.

---

## Docker

Dockerfile w korzeniu repozytorium — multi-stage:
1. **frontend** — `node:20-alpine`, `npm run build` → `/app/server/wwwroot`
2. **backend** — `dotnet/sdk:9.0`, `dotnet publish` + kopiuje wwwroot
3. **runtime** — `dotnet/aspnet:9.0`, port `8080`

Zmienne środowiskowe kontenera:
- `APP_PASSWORD` — hasło dostępu (obowiązkowe na produkcji)

Przykład uruchomienia gotowego obrazu: `docker-compose.example.yml`.
Nazwa obrazu: `kgdnet/loteria:latest`.

---

## Co jest do zrobienia (TODO)

- [ ] Aktualnie aplikacja nie usuwa wylosowanych uczestników z puli — każde losowanie jest niezależne (wszyscy mogą wygrać wielokrotnie)

---

## Uruchomienie

```bash
# Backend (dev)
cd server
dotnet run

# Frontend (dev)
cd client
npm install
npm run dev

# Frontend (build do wwwroot)
cd client
npm run build
# artefakty trafiają do server/wwwroot/ (skonfigurowane w vite.config.ts)

# Docker
docker build -t kgdnet/loteria:latest .
docker run -p 8080:8080 -e APP_PASSWORD=mojehaslo kgdnet/loteria:latest
```
