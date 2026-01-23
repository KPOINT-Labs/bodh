"use client";

import { Award, Heart, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface CelebrationProps {
  show: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function Celebration({ show }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      const icons = [Sparkles, Star, Heart, Zap, Trophy, Award];
      const colors = [
        "text-yellow-400",
        "text-pink-400",
        "text-blue-400",
        "text-purple-400",
        "text-green-400",
        "text-orange-400",
      ];

      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.5,
        delay: Math.random() * 200,
        icon: icons[Math.floor(Math.random() * icons.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
      }));

      setParticles(newParticles);
    }
  }, [show]);

  if (!(show && mounted)) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {particles.map((particle) => {
        const Icon = particle.icon;
        return (
          <div
            className="absolute animate-float-up"
            key={particle.id}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}ms`,
              transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            }}
          >
            <Icon className={`h-6 w-6 ${particle.color} animate-spin-slow`} />
          </div>
        );
      })}
    </div>,
    document.body
  );
}
