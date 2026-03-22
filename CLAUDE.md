# KGD Loteria — CLAUDE.md

## Czym jest projekt

Aplikacja webowa do losowania nagród na spotkaniach społeczności **KGD.NET**.
Wizualnie nawiązuje do mechaniki otwierania skrzynek z CS:GO — poziomy pasek z kartami uczestników przesuwa się i zatrzymuje na wylosowanym zwycięzcy.

Aplikacja jest **w trakcie budowy**.

---

## Architektura

```
KgdLoteria/
├── client/         # Frontend — React 18 + TypeScript + Vite
└── server/         # Backend  — ASP.NET Core (.NET 9), minimal API
```

Backend serwuje frontend jako pliki statyczne (`wwwroot/`). W trybie dev frontend działa na porcie Vite, a backend na osobnym porcie z CORS AllowAny.

---

## Backend (`server/`)

**Jeden plik:** `Program.cs` — minimal API.

### Endpointy

| Metoda | Ścieżka | Opis |
|--------|---------|------|
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
│   ├── ParticipantCard.tsx    # Karta uczestnika na taśmie
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

## Co jest do zrobienia (TODO)

- [ ] **Ekran hasła** — przed możliwością wgrania pliku użytkownik musi wpisać hasło
- [ ] **Reset danych** — przycisk do usunięcia wczytanego Excela i powrotu do stanu pustego (możliwość wgrania nowego pliku od zera)
- [ ] Aktualnie aplikacja nie usuwa wylosowanych uczestników z puli — każde losowanie jest niezależne (wszyscy mogą wygrać wielokrotnie)

---

## Uruchomienie

```bash
# Backend
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
```
