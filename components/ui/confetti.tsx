"use client";

import confetti from "canvas-confetti";

/**
 * Simple function to fire confetti from anywhere
 */
export function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 200,
    gravity: 0,
    decay: 0.96,
    startVelocity: 30,
    colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
  });

  confetti({
    ...defaults,
    particleCount: 10,
    scalar: 0.75,
  });
}
