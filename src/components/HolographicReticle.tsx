import React from 'react';

interface HolographicReticleProps {
  x: number;
  y: number;
  isPinching: boolean;
  dwellProgress: number; // 0 to 1
  isHoveringInteractable: boolean;
  color?: string;
  trackingMode: 'GESTURE' | 'POINTER' | 'TOUCH';
}

export const HolographicReticle: React.FC<HolographicReticleProps> = ({
  x,
  y,
  isPinching,
  dwellProgress,
  isHoveringInteractable,
  color = '#00f3ff',
  trackingMode,
}) => {
  if (x < 0 || y < 0) return null;

  const radius = isPinching ? 18 : isHoveringInteractable ? 28 : 22;
  const strokeDashoffset = 100 - dwellProgress * 100;

  return (
    <div
      className="pointer-events-none fixed z-50 transition-transform duration-75 ease-out"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer Rotating Sci-Fi Ring */}
      <div
        className="absolute -inset-6 rounded-full border border-dashed opacity-40 animate-spin-slow"
        style={{ borderColor: color }}
      />

      {/* Counter-rotating Inner Brackets */}
      <div
        className="absolute -inset-4 rounded-full border border-dotted opacity-60 animate-spin-reverse"
        style={{ borderColor: color }}
      />

      {/* SVG Dwell Progress & Target Reticle */}
      <svg className="h-14 w-14 overflow-visible" viewBox="0 0 50 50">
        {/* Static Base Circle */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Dynamic Dwell Progress Circle */}
        {dwellProgress > 0 && (
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 * (1 - dwellProgress)}
            strokeLinecap="round"
            className="transition-all duration-75"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
              transform: 'rotate(-90deg)',
              transformOrigin: '25px 25px',
            }}
          />
        )}

        {/* Reticle Crosshairs */}
        <line x1="25" y1="5" x2="25" y2="15" stroke={color} strokeWidth="1.5" />
        <line x1="25" y1="35" x2="25" y2="45" stroke={color} strokeWidth="1.5" />
        <line x1="5" y1="25" x2="15" y2="25" stroke={color} strokeWidth="1.5" />
        <line x1="35" y1="25" x2="45" y2="25" stroke={color} strokeWidth="1.5" />

        {/* Center Target Dot */}
        <circle
          cx="25"
          cy="25"
          r={isPinching ? 6 : 3}
          fill={color}
          className="transition-all duration-150"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>

      {/* Pinch Pulse Wave */}
      {isPinching && (
        <div
          className="absolute -inset-5 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Floating HUD Coordinate Tag */}
      <div
        className="absolute left-8 top-2 whitespace-nowrap rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-cyan-300 backdrop-blur-md border border-cyan-500/30 shadow-lg"
      >
        <span className="text-cyan-400">X:</span>{Math.round(x).toString().padStart(4, '0')}{' '}
        <span className="text-cyan-400">Y:</span>{Math.round(y).toString().padStart(4, '0')}{' '}
        <span className="text-emerald-400">[{trackingMode}]</span>
      </div>
    </div>
  );
};
