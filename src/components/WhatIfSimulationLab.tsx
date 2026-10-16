import React, { useState } from 'react';
import { Play, RotateCcw, Zap, Activity, Eye, BookmarkPlus, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  simulateProjectile,
  simulateOscillator,
  simulateThinLens,
  ProjectileParams,
  OscillatorParams,
  OpticsParams,
} from '../utils/physics.ts';
import { holoAudio } from '../utils/audioFeedback.ts';

type SimScenario = 'PROJECTILE' | 'OSCILLATOR' | 'OPTICS';

interface WhatIfSimulationLabProps {
  onSaveToNotebook?: (entry: {
    title: string;
    type: string;
    details: string;
    metrics: any;
  }) => void;
}

export const WhatIfSimulationLab: React.FC<WhatIfSimulationLabProps> = ({ onSaveToNotebook }) => {
  const [scenario, setScenario] = useState<SimScenario>('PROJECTILE');

  // Projectile state
  const [projParams, setProjParams] = useState<ProjectileParams>({
    initialVelocity: 25,
    angleDeg: 45,
    gravity: 9.81,
    initialHeight: 0,
    airDragCoefficient: 0.02,
  });

  // Oscillator state
  const [oscParams, setOscParams] = useState<OscillatorParams>({
    mass: 1.0,
    springConstant: 40,
    dampingCoefficient: 0.8,
    initialDisplacement: 1.5,
    duration: 5,
  });

  // Optics state
  const [optParams, setOptParams] = useState<OpticsParams>({
    focalLengthMm: 60,
    objectDistanceMm: 120,
    objectHeightMm: 30,
  });

  const projResult = simulateProjectile(projParams);
  const oscResult = simulateOscillator(oscParams);
  const optResult = simulateThinLens(optParams);

  const handleSave = () => {
    if (!onSaveToNotebook) return;
    holoAudio.playVerifySuccess();

    if (scenario === 'PROJECTILE') {
      onSaveToNotebook({
        title: 'What-If: Ballistic Trajectory & Aerodynamic Drag',
        type: 'PHYSICS_SIMULATION',
        details: `v0: ${projParams.initialVelocity} m/s, θ: ${projParams.angleDeg}°, Drag: ${projParams.airDragCoefficient}. Range: ${projResult.horizontalRange} m, Max H: ${projResult.maxHeight} m, Flight Time: ${projResult.totalFlightTime} s.`,
        metrics: projResult,
      });
    } else if (scenario === 'OSCILLATOR') {
      onSaveToNotebook({
        title: 'What-If: Damped Harmonic Oscillator',
        type: 'PHYSICS_SIMULATION',
        details: `Mass: ${oscParams.mass} kg, k: ${oscParams.springConstant} N/m, b: ${oscParams.dampingCoefficient}. Regime: ${oscResult.regime}, Natural Freq: ${oscResult.naturalFreqHz} Hz.`,
        metrics: oscResult,
      });
    } else {
      onSaveToNotebook({
        title: 'What-If: Gaussian Thin Lens Optics',
        type: 'PHYSICS_SIMULATION',
        details: `f: ${optParams.focalLengthMm} mm, do: ${optParams.objectDistanceMm} mm. di: ${optResult.imageDistanceMm} mm, M: ${optResult.magnification}x (${optResult.isReal ? 'Real' : 'Virtual'}, ${optResult.isInverted ? 'Inverted' : 'Erect'}).`,
        metrics: optResult,
      });
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
      {/* Simulation Graph / Ray Canvas */}
      <div className="relative flex-1 rounded-xl border border-cyan-500/40 bg-slate-950 overflow-hidden flex flex-col justify-between min-h-[420px]">
        {/* Telemetry header */}
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-hud font-bold text-cyan-300">
              DYNAMIC WHAT-IF SIMULATION ENGINE // {scenario}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              CONSERVATION IDENTITY: VERIFIED
            </span>
            <button
              onClick={handleSave}
              className="holo-depth-btn px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-hud font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(0,243,255,0.4)]"
            >
              <BookmarkPlus className="h-3 w-3" /> Log Run
            </button>
          </div>
        </div>

        {/* Visual Graph Area */}
        <div className="relative flex-1 p-4 flex items-center justify-center">
          {scenario === 'PROJECTILE' && (
            <svg className="w-full h-full max-h-[340px]" viewBox="0 0 500 300">
              {/* Axes and Grid */}
              <line x1="40" y1="260" x2="480" y2="260" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="40" y2="260" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1.5" />

              {/* Grid ticks */}
              {[60, 110, 160, 210].map((y) => (
                <line key={y} x1="40" y1={y} x2="480" y2={y} stroke="rgba(0, 243, 255, 0.08)" strokeDasharray="3 3" />
              ))}

              {/* Trajectory Polyline */}
              {projResult.path.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#00f3ff"
                  strokeWidth="3"
                  className="filter drop-shadow-[0_0_8px_#00f3ff]"
                  points={projResult.path
                    .map((p) => {
                      const maxR = Math.max(50, projResult.horizontalRange);
                      const maxH = Math.max(30, projResult.maxHeight);
                      const px = 40 + (p.x / maxR) * 420;
                      const py = 260 - (p.y / maxH) * 220;
                      return `${px},${py}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Apogee marker */}
              <circle
                cx={40 + (projResult.horizontalRange / 2 / Math.max(50, projResult.horizontalRange)) * 420}
                cy={260 - 220}
                r="4"
                fill="#ffaa00"
                className="animate-ping"
              />
              <text
                x="440"
                y="280"
                fill="#00f3ff"
                fontSize="11"
                fontFamily="monospace"
                textAnchor="end"
              >
                Range: {projResult.horizontalRange} m
              </text>
              <text
                x="45"
                y="35"
                fill="#ffaa00"
                fontSize="11"
                fontFamily="monospace"
              >
                Max Height: {projResult.maxHeight} m
              </text>
            </svg>
          )}

          {scenario === 'OSCILLATOR' && (
            <svg className="w-full h-full max-h-[340px]" viewBox="0 0 500 300">
              <line x1="40" y1="150" x2="480" y2="150" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="40" y2="280" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1.5" />

              {/* Waveform */}
              {oscResult.points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#00ff9d"
                  strokeWidth="2.5"
                  className="filter drop-shadow-[0_0_8px_#00ff9d]"
                  points={oscResult.points
                    .map((p) => {
                      const px = 40 + (p.t / oscParams.duration) * 440;
                      const py = 150 - (p.x / (oscParams.initialDisplacement || 1)) * 100;
                      return `${px},${py}`;
                    })
                    .join(' ')}
                />
              )}
              <text x="440" y="140" fill="#00ff9d" fontSize="11" font-mono textAnchor="end">
                Time (t) →
              </text>
              <text x="50" y="35" fill="#00ff9d" fontSize="11" font-mono>
                Displacement x(t) [{oscResult.regime}]
              </text>
            </svg>
          )}

          {scenario === 'OPTICS' && (
            <svg className="w-full h-full max-h-[340px]" viewBox="0 0 500 300">
              {/* Optical Axis */}
              <line x1="20" y1="150" x2="480" y2="150" stroke="rgba(0, 243, 255, 0.5)" strokeWidth="1.5" />

              {/* Lens (vertical line with arrows) */}
              <line x1="250" y1="40" x2="250" y2="260" stroke="#00f3ff" strokeWidth="3" />
              <text x="250" y="30" fill="#00f3ff" fontSize="11" font-hud textAnchor="middle">
                Thin Lens (f = {optParams.focalLengthMm}mm)
              </text>

              {/* Object Arrow */}
              {(() => {
                const objX = 250 - optParams.objectDistanceMm;
                const objY = 150 - optParams.objectHeightMm;
                const imgX = 250 + optResult.imageDistanceMm;
                const imgY = 150 + optResult.imageHeightMm;

                return (
                  <>
                    {/* Object */}
                    <line x1={objX} y1="150" x2={objX} y2={objY} stroke="#ffaa00" strokeWidth="3" />
                    <polygon points={`${objX},${objY} ${objX - 4},${objY + 8} ${objX + 4},${objY + 8}`} fill="#ffaa00" />
                    <text x={objX} y="170" fill="#ffaa00" fontSize="10" font-mono textAnchor="middle">
                      Object
                    </text>

                    {/* Image */}
                    {isFinite(optResult.imageDistanceMm) && (
                      <>
                        <line x1={imgX} y1="150" x2={imgX} y2={imgY} stroke="#00ff9d" strokeWidth="3" strokeDasharray={optResult.isReal ? 'none' : '4 4'} />
                        <polygon points={`${imgX},${imgY} ${imgX - 4},${imgY + (optResult.isInverted ? -8 : 8)} ${imgX + 4},${imgY + (optResult.isInverted ? -8 : 8)}`} fill="#00ff9d" />
                        <text x={imgX} y="170" fill="#00ff9d" fontSize="10" font-mono textAnchor="middle">
                          Image ({optResult.isReal ? 'Real' : 'Virtual'})
                        </text>

                        {/* Chief Ray through lens center */}
                        <line x1={objX} y1={objY} x2={imgX} y2={imgY} stroke="rgba(255, 0, 128, 0.6)" strokeWidth="1.2" strokeDasharray="3 3" />
                        {/* Parallel Ray to lens then to focal point */}
                        <line x1={objX} y1={objY} x2="250" y2={objY} stroke="rgba(0, 243, 255, 0.6)" strokeWidth="1.2" />
                        <line x1="250" y1={objY} x2={imgX} y2={imgY} stroke="rgba(0, 243, 255, 0.6)" strokeWidth="1.2" />
                      </>
                    )}
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="p-3 bg-slate-900/90 border-t border-cyan-500/20 flex gap-2">
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setScenario('PROJECTILE');
            }}
            className={`holo-depth-btn px-3 py-1.5 rounded-lg text-xs font-hud font-bold transition-all border ${
              scenario === 'PROJECTILE'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            1. Ballistic & Air Drag
          </button>
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setScenario('OSCILLATOR');
            }}
            className={`holo-depth-btn px-3 py-1.5 rounded-lg text-xs font-hud font-bold transition-all border ${
              scenario === 'OSCILLATOR'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            2. Harmonic Oscillator
          </button>
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setScenario('OPTICS');
            }}
            className={`holo-depth-btn px-3 py-1.5 rounded-lg text-xs font-hud font-bold transition-all border ${
              scenario === 'OPTICS'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            3. Optics & Thin Lens
          </button>
        </div>
      </div>

      {/* Interactive Sliders Column */}
      <div className="w-full lg:w-88 flex flex-col gap-3">
        {scenario === 'PROJECTILE' && (
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3 space-y-3">
            <span className="text-xs font-hud font-bold text-cyan-300 block">
              WHAT-IF INPUT VARIABLES
            </span>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Launch Velocity (v₀):</span>
                <span className="text-cyan-400 font-bold">{projParams.initialVelocity} m/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={projParams.initialVelocity}
                onChange={(e) =>
                  setProjParams({ ...projParams, initialVelocity: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Launch Angle (θ):</span>
                <span className="text-cyan-400 font-bold">{projParams.angleDeg}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                value={projParams.angleDeg}
                onChange={(e) =>
                  setProjParams({ ...projParams, angleDeg: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Aerodynamic Drag (Cd):</span>
                <span className="text-cyan-400 font-bold">{projParams.airDragCoefficient}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.005"
                value={projParams.airDragCoefficient}
                onChange={(e) =>
                  setProjParams({ ...projParams, airDragCoefficient: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="rounded-lg bg-slate-950 p-2 border border-cyan-500/20 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Horizontal Range:</span>
                <span className="text-emerald-400 font-bold">{projResult.horizontalRange} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Apogee Max Height:</span>
                <span className="text-emerald-400 font-bold">{projResult.maxHeight} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flight Duration:</span>
                <span className="text-cyan-300 font-bold">{projResult.totalFlightTime} s</span>
              </div>
            </div>
          </div>
        )}

        {scenario === 'OSCILLATOR' && (
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3 space-y-3">
            <span className="text-xs font-hud font-bold text-cyan-300 block">
              OSCILLATOR COEFFICIENTS
            </span>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Spring Constant (k):</span>
                <span className="text-cyan-400 font-bold">{oscParams.springConstant} N/m</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={oscParams.springConstant}
                onChange={(e) =>
                  setOscParams({ ...oscParams, springConstant: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Damping (b):</span>
                <span className="text-cyan-400 font-bold">{oscParams.dampingCoefficient} N·s/m</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={oscParams.dampingCoefficient}
                onChange={(e) =>
                  setOscParams({ ...oscParams, dampingCoefficient: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="rounded-lg bg-slate-950 p-2 border border-cyan-500/20 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Natural Frequency f₀:</span>
                <span className="text-emerald-400 font-bold">{oscResult.naturalFreqHz} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Damping Ratio ζ:</span>
                <span className="text-cyan-300 font-bold">{oscResult.dampingRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">System Regime:</span>
                <span className="text-emerald-400 font-bold">{oscResult.regime}</span>
              </div>
            </div>
          </div>
        )}

        {scenario === 'OPTICS' && (
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3 space-y-3">
            <span className="text-xs font-hud font-bold text-cyan-300 block">
              LENS PARAMETERS
            </span>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Focal Length (f):</span>
                <span className="text-cyan-400 font-bold">{optParams.focalLengthMm} mm</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                value={optParams.focalLengthMm}
                onChange={(e) =>
                  setOptParams({ ...optParams, focalLengthMm: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Object Distance (d_o):</span>
                <span className="text-cyan-400 font-bold">{optParams.objectDistanceMm} mm</span>
              </div>
              <input
                type="range"
                min="30"
                max="200"
                value={optParams.objectDistanceMm}
                onChange={(e) =>
                  setOptParams({ ...optParams, objectDistanceMm: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="rounded-lg bg-slate-950 p-2 border border-cyan-500/20 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Image Distance d_i:</span>
                <span className="text-emerald-400 font-bold">{optResult.imageDistanceMm} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Magnification M:</span>
                <span className="text-cyan-300 font-bold">{optResult.magnification}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gaussian Residual:</span>
                <span className="text-emerald-400 font-bold">
                  {optResult.formulaResidual.toExponential(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
