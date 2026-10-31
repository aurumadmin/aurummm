import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRotation: number;
  alpha: number;
  shape: 'rect' | 'circle' | 'heart';
}

interface ConfettiCanvasProps {
  triggerBurst?: boolean;
  onBurstComplete?: () => void;
}

export default function ConfettiCanvas({ triggerBurst, onBurstComplete }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#a855f7'];

  const spawnParticles = (count: number, originX?: number, originY?: number) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const startX = originX ?? width / 2;
    const startY = originY ?? height / 3;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.2,
        alpha: 1,
        shape: Math.random() > 0.3 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'heart'
      });
    }
  };

  useEffect(() => {
    if (triggerBurst) {
      spawnParticles(120);
      if (onBurstComplete) {
        setTimeout(onBurstComplete, 100);
      }
    }
  }, [triggerBurst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial ambient floating sparkles
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.8 + 0.2,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vRotation: 0.01,
        alpha: Math.random() * 0.8 + 0.2,
        shape: 'circle'
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // Gravity
        p.rotation += p.vRotation;
        p.alpha -= 0.005;

        if (p.alpha <= 0 || p.y > canvas.height + 50) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.vy = Math.random() * 1 + 0.5;
          p.alpha = Math.random() * 0.7 + 0.3;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.font = `${p.size * 2}px sans-serif`;
          ctx.fillText('❤️', 0, 0);
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30 w-full h-full"
    />
  );
}
