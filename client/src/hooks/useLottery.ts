import { useCallback, useEffect, useRef, useState } from "react";
import { LotteryState, Participant } from "../types";

const SLOT      = 252;   // px per card slot
const CARD_W    = 233;
const N_VIS     = 5;
const STRIP_W   = N_VIS * SLOT - (SLOT - CARD_W);

const SPIN_SPEED    = 5000;   // px/s initial
const DECEL_SLOW    = 0.9808; // per-frame multiplier during slow phase
// S_inf (total decel distance from SPIN_SPEED) = (SPIN_SPEED/60) * DECEL_SLOW / (1-DECEL_SLOW) ≈ 4256 px
// Trigger slowing at SLOT*12 = 3024 px < 4256 px → strip always overshoots target slightly,
// then we snap exactly (at most 1 frame of movement, imperceptible).
const DECEL_DIST    = SLOT * 12; // px remaining when we start slowing
const PAUSE_MS      = 150;    // pause on winner card before panel
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
  const curOffset  = useRef(0);   // absolute, ever-increasing — never reset to 0 mid-session
  const targetOff  = useRef(0);
  const stateRef   = useRef<LotteryState>("idle");
  const pauseStart = useRef(0);
  const rafId      = useRef(0);
  const lastTime   = useRef(0);
  const tapeRef    = useRef<Participant[]>([]);
  const winIdxRef  = useRef(0);
  const idleRaf    = useRef(0);

  // Idle animation: uses curOffset directly (no separate ref, no modulo)
  const startIdleAnim = useCallback(() => {
    const tick = () => {
      if (stateRef.current !== "idle") return;
      curOffset.current += 0.4;
      setOffset(curOffset.current);
      idleRaf.current = requestAnimationFrame(tick);
    };
    idleRaf.current = requestAnimationFrame(tick);
  }, []);

  // When participants change (new file loaded) — shuffle once, reset offset
  useEffect(() => {
    cancelAnimationFrame(idleRaf.current);
    cancelAnimationFrame(rafId.current);
    if (participants.length === 0) return;
    const t = shuffle(participants);
    tapeRef.current = t;
    setTape(t);
    curOffset.current = 0;
    stateRef.current = "idle";
    setState("idle");
    setWinner(null);
    setGlowT(0);
    setRevealT(0);
    setShowConfetti(false);
    startIdleAnim();
    return () => cancelAnimationFrame(idleRaf.current);
  }, [participants, startIdleAnim]);

  // spin — winner is drawn client-side via Math.random(), no server call needed.
  const spin = useCallback(() => {
    const n = tapeRef.current.length;
    if (n === 0) return;
    cancelAnimationFrame(idleRaf.current);
    cancelAnimationFrame(rafId.current);

    // 1. Draw winner at the very start of the spin
    const idx = Math.floor(Math.random() * n);
    const w   = tapeRef.current[idx];
    setWinner(w);
    winIdxRef.current = idx;
    setWinnerIdx(idx);

    // 2. Compute exact target offset so the tape stops precisely on the winner.
    //    targetOff ≡ winnerBase (mod loopLen), and is at least 4 full loops ahead
    //    of the current position, guaranteeing a visually satisfying spin duration.
    vel.current = SPIN_SPEED / 60;
    const loopLen    = n * SLOT;
    const stripCenter = Math.floor(N_VIS / 2) * SLOT;
    const winnerBase = idx * SLOT - stripCenter;
    // ceil((curOffset - winnerBase) / loopLen) + 4 gives the number of full loop-lengths
    // to add to winnerBase so that the result is > curOffset + 3*loopLen (at least 4 loops ahead)
    const loopsNeeded = Math.ceil((curOffset.current - winnerBase) / loopLen) + 4;
    targetOff.current = winnerBase + loopsNeeded * loopLen;

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
        if (dist < DECEL_DIST) {
          stateRef.current = "slowing";
          setState("slowing");
        }
      } else if (s === "slowing") {
        vel.current *= Math.pow(DECEL_SLOW, dt * 60);
        const dist = targetOff.current - curOffset.current;
        const step = vel.current * dt * 60;
        if (step >= dist || dist <= 1) {
          // Next step would overshoot or we're within 1 px — snap exactly to target.
          // Because DECEL_DIST < S_inf, the strip always reaches the target;
          // the snap is at most ~1 frame of movement (imperceptible).
          curOffset.current = targetOff.current;
          vel.current       = 0;
          stateRef.current  = "paused";
          setState("paused");
          pauseStart.current = performance.now();
        } else {
          curOffset.current += step;
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
    // Keep tape and current offset — just restart idle from where we are
    stateRef.current = "idle";
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
