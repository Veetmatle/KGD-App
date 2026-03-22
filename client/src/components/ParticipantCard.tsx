import { CSSProperties } from "react";
import { Participant } from "../types";

const PALETTES = [
  { bg: "linear-gradient(160deg,#16213A,#0D1628)", accent: "#5B8FE8", border: "#3a6abf" },
  { bg: "linear-gradient(160deg,#22163A,#160D28)", accent: "#9B5BE8", border: "#7040c0" },
  { bg: "linear-gradient(160deg,#112438,#0B1828)", accent: "#28C8D8", border: "#1a9aaa" },
  { bg: "linear-gradient(160deg,#261422,#180D16)", accent: "#E05090", border: "#b03a6a" },
  { bg: "linear-gradient(160deg,#112420,#0B1814)", accent: "#32C878", border: "#229a58" },
  { bg: "linear-gradient(160deg,#241A0A,#180F05)", accent: "#E0A028", border: "#b07818" },
];

interface Props {
  participant: Participant;
  glowT?: number;   // 0..1 highlight intensity
  width: number;
  height: number;
}

export default function ParticipantCard({ participant, glowT = 0, width, height }: Props) {
  const pal = PALETTES[participant.id % PALETTES.length];
  const hl  = glowT > 0.01;

  const accentRgb = hexToRgb(pal.accent);
  const glowColor = `rgba(${accentRgb},${glowT * 0.7})`;

  const style: CSSProperties = {
    width, height,
    background: hl
      ? `linear-gradient(160deg, ${lighten(pal.accent, -60)}, ${lighten(pal.accent, -80)})`
      : pal.bg,
    borderRadius: 18,
    border: `${hl ? 3 : 2}px solid`,
    borderColor: hl ? pal.accent : pal.border,
    boxShadow: hl
      ? `0 0 ${30 * glowT}px ${12 * glowT}px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.15)`
      : "inset 0 1px 0 rgba(255,255,255,0.06)",
    position: "relative",
    overflow: "hidden",
    transition: "box-shadow 0.1s, border-color 0.1s",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={style}>
      {/* top accent bar */}
      <div style={{
        height: 10, margin: "5px 5px 0",
        background: `linear-gradient(90deg, ${lighten(pal.accent, 40)}, ${pal.accent})`,
        borderRadius: 6,
      }} />

      {/* sheen overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)",
        borderRadius: 18, pointerEvents: "none",
      }} />

      {/* content */}
      <div style={{ padding: "12px 17px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* ID */}
        <div style={{
          fontSize: 14, fontWeight: 700, letterSpacing: 1,
          color: hl ? pal.accent : `${pal.accent}99`,
          marginBottom: 7,
        }}>
          #{String(participant.id).padStart(2, "0")}
        </div>

        {/* separator */}
        <div style={{ height: 1, background: `${pal.accent}30`, marginBottom: 12 }} />

        {/* nick */}
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: hl ? "#ffffff" : "#d0d8ee",
          lineHeight: 1.3,
          wordBreak: "break-word",
          flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          textAlign: "center",
        }}>
          {participant.nick}
        </div>

        {/* email */}
        <div style={{
          fontSize: 13, marginTop: 12,
          color: participant.mail ? (hl ? pal.accent : `${pal.accent}aa`) : "#3a4560",
          textAlign: "center",
          wordBreak: "break-all",
          lineHeight: 1.3,
        }}>
          {participant.mail || "brak e-mail"}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function lighten(hex: string, amt: number) {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amt));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amt));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amt));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}
