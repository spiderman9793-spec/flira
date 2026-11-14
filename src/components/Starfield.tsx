import { useEffect, useRef } from 'react';

export function Starfield({ theme }: { theme: 'dark' | 'light' }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let rafId = 0;
    let stars: { x: number; y: number; z: number; phase: number }[] = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const count = Math.min(130, Math.floor(width / 11));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 1.4 + 0.35,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (theme === 'dark') {
        for (const s of stars) {
          if (!reducedMotion) {
            s.y -= s.z * 0.14;
            s.x += Math.sin(s.phase + s.y / 95) * 0.12;
            if (s.y < 0) s.y = height;
          }
          ctx.fillStyle =
            s.z > 1.25
              ? `rgba(223, 192, 124, ${0.28 + s.z / 3.2})`
              : `rgba(186, 210, 255, ${0.22 + s.z / 3.5})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.z, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={ref}
      className="stars-canvas"
      style={{ opacity: theme === 'dark' ? 1 : 0 }}
      aria-hidden="true"
    />
  );
}
