import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  size: number;
  color: string;
  angle: number;
  distance: number;
  duration: number;
  delay: number;
}

interface ParticleExplosionProps {
  active: boolean;
  color?: string;
  onComplete?: () => void;
}

export const ParticleExplosion = ({
  active,
  color = "oklch(0.577 0.245 27.325)",
  onComplete,
}: ParticleExplosionProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const generateParticles = useCallback(() => {
    const count = 20;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        id: i,
        size: 4 + Math.random() * 8,
        color,
        angle: (360 / count) * i + (Math.random() - 0.5) * 30,
        distance: 80 + Math.random() * 120,
        duration: 500 + Math.random() * 300,
        delay: Math.random() * 100,
      });
    }
    return particles;
  }, [color]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    setParticles(generateParticles());

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 900);

    return () => clearTimeout(timer);
  }, [active, generateParticles, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {particles.map((p) => {
        const radians = (p.angle * Math.PI) / 180;
        const endX = Math.cos(radians) * p.distance;
        const endY = Math.sin(radians) * p.distance;

        return (
          <div
            key={p.id}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animation: `vanilla-disintegrate ${p.duration}ms ease-out ${p.delay}ms forwards`,
              "--end-x": `${endX}px`,
              "--end-y": `${endY}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};
