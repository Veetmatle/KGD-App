import { useCallback, useEffect, useRef, useState } from "react";
import { LotteryState, Participant } from "../types";

const SLOT      = 210;   // px per card slot
const CARD_W    = 194;
const N_VIS     = 5;
const STRIP_W   = N_VIS * SLOT - (SLOT - CARD_W);

const SPIN_SPEED    = 5000;   // px/s initial
const DECEL_SLOW    = 0.978;  // per-frame multiplier during slow phase
const MIN_SPEED     = 6;      // snap threshold px/s
const PAUSE_MS      = 150;   // pause on winner card before panel
const REVEAL_SPEED  = 0.03;   // per frame 0→1

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useLottery(participants: Participant[]) {
  const [state, setState]         = useState<LotteryState>("idle");
  const [offset, setOffset]       = useState(0);
  const [tape, setTape]           = useState<Participant[]>([]);
  const [winner, setWinner]       = useState<Participant | null>(null);
  const [winnerIdx, setWinnerIdx] = useState(0);
  const [glowT, setGlowT]         = useState(0);
  const [revealT, setRevealT]     = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // physics refs (mutable, no re-render)
  const vel        = useRef(0);
  const curOffset  = useRef(0);
  const targetOff  = useRef(0);
  const stateRef   = useRef<LotteryState>("idle");
  const pauseStart = useRef(0);
  const rafId      = useRef(0);
  const lastTime   = useRef(0);
  const tapeRef    = useRef<Participant[]>([]);
  const winIdxRef  = useRef(0);

  // idle animation
  const idleOffset = useRef(0);
  const idleRaf    = useRef(0);

  const loopLen = () => tapeRef.current.length * SLOT;

  const startIdleAnim = useCallback(() => {
    const tick = () => {
      if (stateRef.current !== "idle") return;
      idleOffset.current = (idleOffset.current + 0.4) % loopLen();
      setOffset(idleOffset.current);
      idleRaf.current = requestAnimationFrame(tick);
    };
    idleRaf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (participants.length === 0) return;
    const t = shuffle(participants);
    tapeRef.current = t;
    setTape(t);
    stateRef.current = "idle";
    setState("idle");
    startIdleAnim();
    return () => cancelAnimationFrame(idleRaf.current);
  }, [participants, startIdleAnim]);

  const spin = useCallback(() => {
    if (participants.length === 0) return;
    cancelAnimationFrame(idleRaf.current);
    cancelAnimationFrame(rafId.current);

    // PRAWDZIWE losowanie
    const w = participants[Math.floor(Math.random() * participants.length)];
    setWinner(w);

    const newTape = shuffle(participants);
    tapeRef.current = newTape;
    setTape(newTape);

    const idx = newTape.findIndex((p) => p.id === w.id);
    winIdxRef.current = idx;
    setWinnerIdx(idx);

    // target: winner card wyśrodkowany w stripie
    const stripCenter = Math.floor(N_VIS / 2) * SLOT;
    let raw = idx * SLOT - stripCenter;
    const loops = loopLen();
    while (raw <= curOffset.current + loops * 2.5) raw += loops;
    targetOff.current = raw;

    curOffset.current = 0;
    vel.current       = SPIN_SPEED / 60;
    setOffset(0);
    setGlowT(0);
    setRevealT(0);
    setShowConfetti(false);
    stateRef.current = "spinning";
    setState("spinning");
    lastTime.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, 0.05);
      lastTime.current = now;
      const s = stateRef.current;

      if (s === "spinning") {
        curOffset.current += vel.current * dt * 60;
        const dist = targetOff.current - curOffset.current;
        if (dist < SLOT * 14) {
          stateRef.current = "slowing";
          setState("slowing");
        }
      } else if (s === "slowing") {
        vel.current      *= Math.pow(DECEL_SLOW, dt * 60);
        curOffset.current += vel.current * dt * 60;
        const dist = targetOff.current - curOffset.current;
        if (vel.current < MIN_SPEED || dist < 1) {
          curOffset.current = targetOff.current;
          vel.current       = 0;
          stateRef.current  = "paused";
          setState("paused");
          pauseStart.current = performance.now();
        }
      } else if (s === "paused") {
        const elapsed = performance.now() - pauseStart.current;
        const g = Math.min(1, elapsed / (PAUSE_MS * 0.55));
        setGlowT(g);
        if (elapsed >= PAUSE_MS) {
          setShowConfetti(true);
          stateRef.current = "revealing";
          setState("revealing");
        }
      } else if (s === "revealing") {
        setRevealT((r) => {
          const next = Math.min(1, r + REVEAL_SPEED);
          if (next >= 1) {
            stateRef.current = "done";
            setState("done");
            return 1;
          }
          return next;
        });
      } else if (s === "done") {
        return;
      }

      setOffset(curOffset.current);
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
  }, [participants]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    cancelAnimationFrame(idleRaf.current);
    // reshuffle tape so next idle/spin starts fresh
    const reshuffled = shuffle(tapeRef.current);
    tapeRef.current = reshuffled;
    setTape(reshuffled);
    stateRef.current  = "idle";
    curOffset.current = 0;
    idleOffset.current = 0;
    setState("idle");
    setWinner(null);
    setGlowT(0);
    setRevealT(0);
    setShowConfetti(false);
    startIdleAnim();
  }, [startIdleAnim]);

  const clearAll = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    cancelAnimationFrame(idleRaf.current);
    tapeRef.current   = [];
    stateRef.current  = "idle";
    curOffset.current = 0;
    idleOffset.current = 0;
    setState("idle");
    setTape([]);
    setWinner(null);
    setWinnerIdx(0);
    setGlowT(0);
    setRevealT(0);
    setShowConfetti(false);
  }, []);

  return {
    state, offset, tape, winner, winnerIdx,
    glowT, revealT, showConfetti,
    spin, reset, clearAll,
    SLOT, CARD_W, N_VIS, STRIP_W,
  };
}
