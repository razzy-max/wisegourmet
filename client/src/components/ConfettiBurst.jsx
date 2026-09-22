import { useEffect, useState } from 'react';
import './ConfettiBurst.css';

const COLORS = ['#fa6d01', '#c25601', '#2f7d3c', '#d9a915', '#1f7a8c'];
const PARTICLE_COUNT = 18;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A small, one-shot celebration burst around whatever it's placed inside
// (meant to wrap/sit beside a success icon) — fires once on mount, then
// clears itself. Renders nothing at all when reduced motion is
// preferred, rather than rendering static/disabled particles.
export default function ConfettiBurst() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      return undefined;
    }

    const next = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
      const distance = 60 + Math.random() * 70;
      return {
        id: index,
        color: COLORS[index % COLORS.length],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotate: Math.round(Math.random() * 360),
        delay: Math.round(Math.random() * 80),
      };
    });
    setParticles(next);

    const timer = setTimeout(() => setParticles([]), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) {
    return null;
  }

  return (
    <div className="confetti-burst" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="confetti-piece"
          style={{
            '--confetti-x': `${particle.x}px`,
            '--confetti-y': `${particle.y}px`,
            '--confetti-rotate': `${particle.rotate}deg`,
            '--confetti-delay': `${particle.delay}ms`,
            background: particle.color,
          }}
        />
      ))}
    </div>
  );
}
