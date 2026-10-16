import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface HolographicPointerAuraProps {
  x: number;
  y: number;
  isActive: boolean; // only visible when gesture tracking is active
  isPinching: boolean;
  isHoveringButton: boolean;
}

export const HolographicPointerAura: React.FC<HolographicPointerAuraProps> = ({
  x,
  y,
  isActive,
  isPinching,
  isHoveringButton,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Point[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const currentPosRef = useRef({ x, y });

  useEffect(() => {
    currentPosRef.current = { x, y };
  }, [x, y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      animFrameRef.current = requestAnimationFrame(render);

      // Match canvas to parent dimensions
      if (canvas.parentElement) {
        if (canvas.width !== canvas.parentElement.clientWidth) {
          canvas.width = canvas.parentElement.clientWidth;
        }
        if (canvas.height !== canvas.parentElement.clientHeight) {
          canvas.height = canvas.parentElement.clientHeight;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        // Fade out any remaining trail quickly when hand is lost
        trailRef.current = trailRef.current
          .map((pt) => ({ ...pt, alpha: pt.alpha * 0.75 }))
          .filter((pt) => pt.alpha > 0.02);
      } else {
        const { x: currX, y: currY } = currentPosRef.current;
        const baseRadius = isPinching ? 12 : isHoveringButton ? 28 : 20;

        // Add latest point to trail
        trailRef.current.unshift({
          x: currX,
          y: currY,
          alpha: 1.0,
          radius: baseRadius,
        });

        // Limit trail length
        if (trailRef.current.length > 18) {
          trailRef.current.pop();
        }

        // Decay trail alphas
        trailRef.current.forEach((pt, i) => {
          pt.alpha *= 0.88;
          pt.radius = Math.max(3, pt.radius * 0.94);
        });
      }

      // Draw Trailing Cyan Light Ribbon
      const trail = trailRef.current;
      if (trail.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < trail.length - 1; i++) {
          const p1 = trail[i];
          const p2 = trail[i + 1];
          const progress = 1 - i / trail.length;

          // Glowing light stroke
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          ctx.strokeStyle = `rgba(0, 243, 255, ${p1.alpha * 0.55 * progress})`;
          ctx.lineWidth = Math.max(2, p1.radius * 0.7 * progress);
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 16 * progress;
          ctx.stroke();

          // Intense core light beam
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${p1.alpha * 0.7 * progress})`;
          ctx.lineWidth = Math.max(1, p1.radius * 0.25 * progress);
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Active Central Luminous Pointer Aura
      if (isActive && trail.length > 0) {
        const { x: hX, y: hY } = currentPosRef.current;
        const outerGlowRadius = isPinching ? 35 : isHoveringButton ? 65 : 45;
        const coreRadius = isPinching ? 8 : isHoveringButton ? 14 : 10;
        const auraColor = isPinching ? '0, 255, 157' : '0, 243, 255';

        ctx.save();

        // 1. Outermost Ambient Atmospheric Glow Halo
        const ambientGrad = ctx.createRadialGradient(hX, hY, 0, hX, hY, outerGlowRadius);
        ambientGrad.addColorStop(0, `rgba(${auraColor}, 0.45)`);
        ambientGrad.addColorStop(0.4, `rgba(${auraColor}, 0.2)`);
        ambientGrad.addColorStop(1, `rgba(${auraColor}, 0)`);

        ctx.fillStyle = ambientGrad;
        ctx.beginPath();
        ctx.arc(hX, hY, outerGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Focused Spatial Light Aura
        const midGrad = ctx.createRadialGradient(hX, hY, 0, hX, hY, coreRadius * 2.5);
        midGrad.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
        midGrad.addColorStop(0.3, `rgba(${auraColor}, 0.8)`);
        midGrad.addColorStop(1, `rgba(${auraColor}, 0)`);

        ctx.fillStyle = midGrad;
        ctx.shadowColor = `rgb(${auraColor})`;
        ctx.shadowBlur = isHoveringButton ? 28 : 18;
        ctx.beginPath();
        ctx.arc(hX, hY, coreRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Ultra-Bright Energy Core Dot
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(hX, hY, coreRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Subtle Interacting Energy Pulse Ring when Hovering a Button
        if (isHoveringButton) {
          ctx.strokeStyle = `rgba(${auraColor}, 0.65)`;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(hX, hY, coreRadius * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, isPinching, isHoveringButton]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-35 w-full h-full"
    />
  );
};
