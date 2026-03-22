import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  angle: number; spin: number;
  life: number; decay: number;
  color: string;
}

const COLORS = [
  "#FFC828","#ffffff","#23C3AA",
  "#FF5078","#A050FF","#50CC60",
];

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafId     = useRef(0);
  const spawned   = useRef(false);

  useEffect(() => {
    if (!active || spawned.current) return;
    spawned.current = true;

    const canvas = canvasRef.current!;
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2 - 60;

    particles.current = Array.from({ length: 200 }, () => {
      const a  = Math.random() * Math.PI * 2;
      const sp = Math.random() * 900 + 100;
      return {
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - Math.random() * 400,
        w: Math.random() * 12 + 6, h: Math.random() * 6 + 3,
        angle: Math.random() * 360, spin: (Math.random() - 0.5) * 600,
        life: 1, decay: Math.random() * 0.004 + 0.002,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      particles.current = particles.current.filter((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 800 * dt;
        p.angle += p.spin * dt;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 40) return false;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      if (particles.current.length > 0)
        rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [active]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafId.current);
      spawned.current = false;
      particles.current = [];
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 50,
      }}
    />
  );
}
