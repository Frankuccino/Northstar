import { useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";

interface DisintegrateProps {
  active: boolean;
  children: ReactNode;
  onComplete?: () => void;
  particleSize?: number;
  duration?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  gravity: number;
  delay: number;
}

export const Disintegrate = ({
  active,
  children,
  onComplete,
  particleSize = 6,
  duration = 1200,
}: DisintegrateProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isDisintegrating, setIsDisintegrating] = useState(false);

  const sampleColors = useCallback(() => {
    if (!containerRef.current) return [];
    const el = containerRef.current;
    const colors: string[] = [];

    const computed = getComputedStyle(el);
    colors.push(computed.backgroundColor);
    colors.push(computed.color);

    const walk = (node: Element) => {
      const style = getComputedStyle(node);
      if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
        colors.push(style.backgroundColor);
      }
      Array.from(node.children).forEach(walk);
    };
    walk(el);

    return colors.filter((c) => c && c !== "transparent");
  }, []);

  const generateParticles = useCallback(() => {
    if (!containerRef.current) return [];
    const rect = containerRef.current.getBoundingClientRect();
    const cols = Math.ceil(rect.width / particleSize);
    const rows = Math.ceil(rect.height / particleSize);
    const colors = sampleColors();
    const defaultColor = "oklch(0.577 0.245 27.325)";

    const newParticles: Particle[] = [];
    let id = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * particleSize;
        const y = row * particleSize;

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;

        newParticles.push({
          id: id++,
          x,
          y,
          size: particleSize * (0.5 + Math.random() * 0.5),
          color: colors[Math.floor(Math.random() * colors.length)] || defaultColor,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          gravity: 0.1 + Math.random() * 0.1,
          delay: Math.random() * 200,
        });
      }
    }

    return newParticles;
  }, [particleSize, sampleColors]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      setIsDisintegrating(false);
      return;
    }

    setIsDisintegrating(true);
    setParticles(generateParticles());

    const timer = setTimeout(() => {
      setIsDisintegrating(false);
      setParticles([]);
      onComplete?.();
    }, duration + 400);

    return () => clearTimeout(timer);
  }, [active, generateParticles, duration, onComplete]);

  return (
    <div ref={containerRef} className="relative">
      <div
        style={{
          opacity: isDisintegrating ? 0 : 1,
          transition: "opacity 0.3s ease-out",
          pointerEvents: isDisintegrating ? "none" : "auto",
        }}
      >
        {children}
      </div>

      {particles.length > 0 && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ zIndex: 10 }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                animation: `dust-particle ${duration}ms ease-out ${p.delay}ms forwards`,
                "--vx": `${p.vx * 30}px`,
                "--vy": `${p.vy * 30}px`,
                "--rotation": `${p.rotation + p.rotationSpeed * 10}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};
