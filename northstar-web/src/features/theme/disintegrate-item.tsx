import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  rotation: number;
  rotationSpeed: number;
}

interface DisintegrateItemProps {
  children: ReactNode;
  active: boolean;
  onComplete?: () => void;
  className?: string;
}

export const DisintegrateItem = ({ children, active, onComplete, className = "" }: DisintegrateItemProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const initParticles = useCallback(() => {
    if (!containerRef.current) return [];
    const rect = containerRef.current.getBoundingClientRect();
    const particles: Particle[] = [];
    const gridSize = 6;
    const cols = Math.ceil(rect.width / gridSize);
    const rows = Math.ceil(rect.height / gridSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: gridSize * (0.5 + Math.random() * 0.5),
          color: getRandomColor(),
          life: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    }
    return particles;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current
      .map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.1,
        life: p.life - 0.008,
        rotation: p.rotation + p.rotationSpeed,
      }))
      .filter((p) => p.life > 0);

    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size * p.life, p.size * p.life);
      ctx.restore();
    });

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      onComplete?.();
    }
  }, [onComplete]);

  useEffect(() => {
    if (!active) return;

    setVisible(false);
    particlesRef.current = initParticles();

    const canvas = canvasRef.current;
    if (canvas && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationRef.current);
  }, [active, initParticles, draw]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.1s ease-out",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {children}
      </div>
      {active && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
};

function getRandomColor(): string {
  const colors = [
    "oklch(0.65 0.22 350)",
    "oklch(0.7 0.18 30)",
    "oklch(0.5 0.15 20)",
    "oklch(0.8 0.1 0)",
    "oklch(0.6 0.05 300)",
    "oklch(0.55 0.1 250)",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
