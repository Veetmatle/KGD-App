import { useCallback, useEffect, useRef, useState } from "react";
import { Participant } from "./types";
import { useLottery } from "./hooks/useLottery";
import ParticipantCard from "./components/ParticipantCard";
import WinnerPanel from "./components/WinnerPanel";
import Confetti from "./components/Confetti";
import LoginScreen from "./components/LoginScreen";
import ParticipantsSidebar from "./components/ParticipantsSidebar";

const CARD_H = 312;

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("auth") === "1");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const {
    state, offset, tape, winner, winnerIdx,
    glowT, revealT, showConfetti,
    spin, reset, clearAll,
    SLOT, CARD_W, N_VIS, STRIP_W,
  } = useLottery(participants);

  // ── file upload ─────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: Participant[] = await res.json();
      setParticipants(data);
    } catch (e: any) {
      setError(`Błąd: ${e.message}`);
    } finally {
      setLoading(false);
      // reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleResetExcel = useCallback(() => {
    clearAll();
    setParticipants([]);
    setError("");
  }, [clearAll]);

  // ── keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // don't fire shortcuts when user is typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === " " || e.key === "Enter") {
        if (state === "idle" && participants.length > 0) spin();
      }
      if (e.key === "r" || e.key === "R") {
        if (state === "done" && participants.length > 0) spin();
        else if (state === "idle" && participants.length > 0) spin();
      }
      if (e.key === "Escape") {
        if (state === "done") reset();
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, participants, spin, reset, sidebarOpen]);

  // ── visible cards ────────────────────────────────────────────────────────────
  const n = tape.length;
  const firstSlot = n > 0 ? Math.floor(offset / SLOT) - 1 : 0;
  const visibleCards = n > 0
    ? Array.from({ length: N_VIS + 3 }, (_, i) => {
        const si  = firstSlot + i;
        const idx = ((si % n) + n) % n;
        const p   = tape[idx];
        const x   = si * SLOT - offset;
        const isWinner =
          (state === "paused" || state === "revealing" || state === "done") &&
          idx === winnerIdx % n;
        return { p, x, isWinner, key: `${si}-${p.id}` };
      })
    : [];

  const statusText =
    state === "idle"     ? (participants.length > 0 ? "SPACJA lub kliknij LOSUJ" : "Wczytaj plik aby rozpocząć") :
    state === "spinning" || state === "slowing" ? "Losowanie w toku…" :
    state === "paused"   ? "Sprawdzamy wynik…" : "";

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div style={{
      minHeight: "100vh", background: "#080B14",
      display: "flex", flexDirection: "column",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#fff", userSelect: "none",
    }}>

      {/* ── logo + sidebar toggle ── */}
      <div style={{ position: "relative", textAlign: "center", paddingTop: 28, paddingBottom: 4 }}>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
          <span style={{ color: "#F0F5FF" }}>KGD</span>
          <span style={{ color: "#FFC828" }}>.</span>
          <span style={{ color: "#FFC828" }}>NET</span>
        </div>
        <div style={{
          height: 4, margin: "6px auto 0",
          width: 220,
          background: "linear-gradient(90deg, #FFC828, #fff, #FFC828)",
          borderRadius: 2,
          animation: "shimmer 3s linear infinite",
        }} />
        <div style={{ color: "#5F6E87", fontSize: 17, marginTop: 8 }}>
          Losowanie nagrody spotkania
        </div>

        {/* sidebar toggle button */}
        {participants.length > 0 && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              position: "absolute",
              right: 24,
              top: "50%",
              transform: "translateY(-50%)",
              background: sidebarOpen ? "#23C3AA22" : "#1a2035",
              color: "#23C3AA",
              border: "1.5px solid #23C3AA",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            👥 Uczestnicy ({participants.length})
          </button>
        )}
      </div>

      {/* ── tape area ── */}
      <div style={{
        flex: 1, display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        position: "relative",
      }}>

        {/* indicators */}
        <div style={{ position: "relative", width: STRIP_W + 12 }}>
          {/* top arrow */}
          <div style={{
            textAlign: "center", fontSize: 0,
            marginBottom: 8,
          }}>
            <svg width="28" height="20" viewBox="0 0 28 20">
              <polygon points="14,18 0,0 28,0" fill="#FFC828" />
            </svg>
          </div>

          {/* track */}
          <div style={{
            position: "relative",
            width: STRIP_W + 12, height: CARD_H + 12,
            background: "#0c1018",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {/* cards */}
            <div style={{
              position: "absolute",
              top: 6, left: 6,
              height: CARD_H,
              width: STRIP_W,
              overflow: "hidden",
            }}>
              {visibleCards.map(({ p, x, isWinner, key }) => (
                <div key={key} style={{
                  position: "absolute",
                  left: x,
                  top: 0,
                  transition: "none",
                }}>
                  <ParticipantCard
                    participant={p}
                    glowT={isWinner ? glowT : 0}
                    width={CARD_W}
                    height={CARD_H}
                  />
                </div>
              ))}
            </div>

            {/* fade left */}
            <div style={{
              position: "absolute", left: 0, top: 0, width: 110, height: "100%",
              background: "linear-gradient(90deg, #080B14 0%, transparent 100%)",
              pointerEvents: "none", zIndex: 2,
            }} />
            {/* fade right */}
            <div style={{
              position: "absolute", right: 0, top: 0, width: 110, height: "100%",
              background: "linear-gradient(270deg, #080B14 0%, transparent 100%)",
              pointerEvents: "none", zIndex: 2,
            }} />
          </div>

          {/* bottom arrow */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <svg width="28" height="20" viewBox="0 0 28 20">
              <polygon points="14,2 0,20 28,20" fill="#FFC828" />
            </svg>
          </div>

          {/* center indicator lines */}
          <div style={{
            position: "absolute",
            left: "50%", top: 0,
            transform: `translateX(${-CARD_W / 2}px)`,
            width: 1, height: "100%",
            background: "rgba(255,200,40,0.25)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            left: "50%", top: 0,
            transform: `translateX(${CARD_W / 2}px)`,
            width: 1, height: "100%",
            background: "rgba(255,200,40,0.25)",
            pointerEvents: "none",
          }} />
        </div>

        {/* status */}
        <div style={{
          height: 32, display: "flex", alignItems: "center",
          justifyContent: "center", marginTop: 16,
          fontSize: 16, color: "#23C3AA",
          animation: state === "paused" ? "pulse 1s ease-in-out infinite" : "none",
        }}>
          {statusText}
        </div>
      </div>

      {/* ── bottom bar ── */}
      <div style={{
        background: "#0D1120",
        borderTop: "1px solid #1a2035",
        padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ color: "#5F6E87", fontSize: 14, flex: 1 }}>
          {participants.length > 0
            ? `Załadowano: ${participants.length} uczestników`
            : "Brak danych"}
        </span>

        {error && (
          <span style={{ color: "#ff5050", fontSize: 13 }}>{error}</span>
        )}

        <input
          ref={fileRef} type="file" accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {participants.length > 0 && (
          <button
            onClick={handleResetExcel}
            disabled={loading || !["idle", "done"].includes(state)}
            style={{
              background: "#1a2035", color: "#ff5050",
              border: "1.5px solid #ff5050",
              borderRadius: 10, padding: "10px 18px",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            🗑  WYCZYŚĆ
          </button>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          style={{
            background: "#1a2035", color: "#23C3AA",
            border: "1.5px solid #23C3AA",
            borderRadius: 10, padding: "10px 22px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {loading ? "Wczytywanie…" : "📂  WCZYTAJ PLIK"}
        </button>

        <button
          onClick={spin}
          disabled={participants.length === 0 || !["idle","done"].includes(state)}
          style={{
            background: participants.length > 0 && ["idle","done"].includes(state)
              ? "#FFC828" : "#3a3a1a",
            color: "#080B14",
            border: "none",
            borderRadius: 10, padding: "11px 32px",
            fontSize: 16, fontWeight: 800, cursor: "pointer",
            boxShadow: participants.length > 0 ? "0 4px 20px #FFC82866" : "none",
            transition: "all 0.2s",
          }}
        >
          🎲  LOSUJ
        </button>
      </div>

      {/* overlays */}
      <Confetti active={showConfetti} />
      {(state === "revealing" || state === "done") && winner && (
        <WinnerPanel winner={winner} revealT={revealT} onReset={reset} onSpin={spin} />
      )}

      {sidebarOpen && (
        <ParticipantsSidebar
          participants={participants}
          onAdd={(p: Participant) => setParticipants((prev) => [...prev, p])}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200px; }
          100% { background-position: 200px; }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        button:disabled { opacity: 0.5; cursor: not-allowed !important; }
      `}</style>
    </div>
  );
}
