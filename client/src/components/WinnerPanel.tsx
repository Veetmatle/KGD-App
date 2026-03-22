import { CSSProperties } from "react";
import { Participant } from "../types";

const PALETTES = [
  "#5B8FE8","#9B5BE8","#28C8D8","#E05090","#32C878","#E0A028",
];

interface Props {
  winner: Participant;
  revealT: number;
  onReset: () => void;
}

export default function WinnerPanel({ winner, revealT, onReset }: Props) {
  const ease   = 1 - Math.pow(1 - revealT, 3);
  const accent = PALETTES[winner.id % PALETTES.length];
  const translateY = `${(1 - ease) * 120}px`;
  const opacity    = ease;

  const overlay: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 40,
    background: `rgba(0,0,0,${0.65 * ease})`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const panel: CSSProperties = {
    width: 600, maxWidth: "90vw",
    background: "linear-gradient(160deg, #161e14, #0a0e0a)",
    border: `2px solid ${accent}`,
    borderRadius: 20,
    boxShadow: `0 0 60px 10px ${accent}55, 0 0 0 1px ${accent}33`,
    transform: `translateY(${translateY})`,
    opacity,
    overflow: "hidden",
    transition: "none",
  };

  const header: CSSProperties = {
    background: `linear-gradient(90deg, ${accent}44, ${accent}88, ${accent}44)`,
    padding: "14px 24px",
    textAlign: "center",
    fontSize: 20, fontWeight: 800,
    color: "#fff",
    letterSpacing: 2,
  };

  return (
    <div style={overlay}>
      <div style={panel}>
        <div style={header}>★  ZWYCIĘZCA  ★</div>
        <div style={{ padding: "28px 36px 24px", textAlign: "center" }}>

          <div style={{ fontSize: 13, color: "#FFC828", fontWeight: 700,
                        letterSpacing: 1, marginBottom: 8 }}>
            ID #{String(winner.id).padStart(2, "0")}
          </div>

          <div style={{ fontSize: 38, fontWeight: 800, color: "#fff",
                        marginBottom: 16, lineHeight: 1.2 }}>
            {winner.nick}
          </div>

          <div style={{ height: 1, background: `${accent}44`, margin: "0 20px 16px" }} />

          <div style={{ fontSize: 15, color: winner.mail ? accent : "#5f6e87" }}>
            {winner.mail || "brak adresu e-mail"}
          </div>

          <div style={{ height: 1, background: "#1e2a1e", margin: "20px 20px 16px" }} />

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onReset} style={{
              background: "#1a2035", color: "#23C3AA",
              border: "1.5px solid #23C3AA",
              borderRadius: 10, padding: "10px 28px",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              🔄 Losuj ponownie
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#3a4560" }}>
            [ R ] losuj ponownie  ·  [ ESC ] zamknij panel
          </div>
        </div>
      </div>
    </div>
  );
}
