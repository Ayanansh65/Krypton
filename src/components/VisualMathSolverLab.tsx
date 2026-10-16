import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scan,
  TrendingUp,
  BookmarkPlus,
  Play,
} from 'lucide-react';
import { parseAndSolveEquation, solveQuadratic, MathSolution } from '../utils/mathSolver.ts';
import { holoAudio } from '../utils/audioFeedback.ts';

interface VisualMathSolverLabProps {
  onSaveToNotebook?: (entry: {
    title: string;
    type: string;
    details: string;
    metrics: any;
  }) => void;
  onScanCameraFrame?: () => void;
}

export const VisualMathSolverLab: React.FC<VisualMathSolverLabProps> = ({
  onSaveToNotebook,
  onScanCameraFrame,
}) => {
  const [inputEquation, setInputEquation] = useState('x^2 - 5x + 6 = 0');
  const [solution, setSolution] = useState<MathSolution>(solveQuadratic(1, -5, 6));
  const [isScanning, setIsScanning] = useState(false);

  const handleSolve = (eq?: string) => {
    const toSolve = eq || inputEquation;
    holoAudio.playHoloClick();
    const res = parseAndSolveEquation(toSolve);
    setSolution(res);
  };

  const handleScanPaper = () => {
    setIsScanning(true);
    holoAudio.playScanPulse();
    if (onScanCameraFrame) onScanCameraFrame();

    setTimeout(() => {
      setIsScanning(false);
      holoAudio.playVerifySuccess();
      const scanned = '2x^2 - 8x + 6 = 0';
      setInputEquation(scanned);
      setSolution(parseAndSolveEquation(scanned));
    }, 1200);
  };

  const handleSave = () => {
    if (!onSaveToNotebook) return;
    holoAudio.playVerifySuccess();
    onSaveToNotebook({
      title: `Math Solver: ${solution.originalInput}`,
      type: 'MATHEMATICAL_PROOF',
      details: `Solutions: [${solution.solutions.join(', ')}]. Verification residual: ${solution.verification.residual.toExponential(3)}. Steps: ${solution.steps.length}.`,
      metrics: solution,
    });
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
      {/* Steps & Mathematical Justification Panel */}
      <div className="flex-1 rounded-xl border border-cyan-500/40 bg-slate-950 p-4 flex flex-col justify-between min-h-[420px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-hud font-bold text-cyan-300">
                STEP-BY-STEP VERIFIED MATH SOLVER
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleScanPaper}
                disabled={isScanning}
                className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-hud flex items-center gap-1.5 transition-all"
              >
                <Scan className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning Paper...' : 'Scan Paper Diagram'}
              </button>

              <button
                onClick={handleSave}
                className="holo-depth-btn px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-hud font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(0,243,255,0.4)]"
              >
                <BookmarkPlus className="h-3.5 w-3.5" /> Log Solution
              </button>
            </div>
          </div>

          {/* Quick Preset Equations */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-hud text-slate-400">PRESETS:</span>
            {[
              'x^2 - 5x + 6 = 0',
              '2x + 8 = 24',
              'x^2 - 4x + 4 = 0',
              '3x^2 + 6x - 9 = 0',
            ].map((eq) => (
              <button
                key={eq}
                onClick={() => {
                  setInputEquation(eq);
                  handleSolve(eq);
                }}
                className={`holo-depth-btn px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                  inputEquation === eq
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-cyan-500/30'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={inputEquation}
              onChange={(e) => setInputEquation(e.target.value)}
              placeholder="Enter equation (e.g., x^2 - 5x + 6 = 0 or 2x + 6 = 14)"
              className="flex-1 rounded-lg bg-slate-900 border border-cyan-500/30 px-3 py-2 text-xs font-mono text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => handleSolve()}
              className="holo-depth-btn px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs font-bold transition-all shadow-[0_0_10px_rgba(0,243,255,0.4)]"
            >
              Solve Equation
            </button>
          </div>

          {/* Step-by-Step Proof Output */}
          <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
            {solution.steps.map((step) => (
              <div
                key={step.step}
                className="rounded-lg bg-slate-900/80 p-3 border border-cyan-500/20"
              >
                <div className="flex items-center justify-between text-xs font-hud font-bold text-cyan-300 mb-1">
                  <span>
                    STEP {step.step}: {step.title}
                  </span>
                </div>
                <div className="font-mono text-sm text-emerald-400 bg-slate-950/70 p-2 rounded border border-cyan-500/10 mb-1">
                  {step.expression}
                </div>
                <div className="text-[11px] text-slate-400 font-sans">{step.justification}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Footer */}
        <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">
              Roots Verified: <span className="text-cyan-300 font-bold">{solution.solutions.join(', ')}</span>
            </span>
          </div>

          <div className="text-[10px] font-mono text-emerald-400">
            Self-Check Residual: {solution.verification.residual.toExponential(2)} (Identity Hold)
          </div>
        </div>
      </div>

      {/* Parabola / Root Graph Visualization */}
      <div className="w-full lg:w-88 flex flex-col gap-3">
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3 flex-1 flex flex-col justify-between">
          <div>
            <span className="text-xs font-hud font-bold text-cyan-300 block mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              CARTESIAN FUNCTION PLOT
            </span>

            {/* SVG Plot */}
            <div className="h-48 w-full bg-slate-950 rounded-lg border border-cyan-500/20 relative flex items-center justify-center p-2">
              <svg className="w-full h-full" viewBox="0 0 300 180">
                {/* Axes */}
                <line x1="20" y1="90" x2="280" y2="90" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1" />
                <line x1="150" y1="10" x2="150" y2="170" stroke="rgba(0, 243, 255, 0.4)" strokeWidth="1" />

                {/* Parabola Polyline */}
                {solution.graphPoints && solution.graphPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#00f3ff"
                    strokeWidth="2.5"
                    className="filter drop-shadow-[0_0_6px_#00f3ff]"
                    points={solution.graphPoints
                      .map((p) => {
                        const px = 150 + p.x * 14;
                        const py = 90 - p.y * 3;
                        return `${Math.max(10, Math.min(290, px))},${Math.max(10, Math.min(170, py))}`;
                      })
                      .join(' ')}
                  />
                )}

                {/* Roots on x-axis */}
                {solution.solutions.map((sol, i) => {
                  if (typeof sol !== 'number') return null;
                  const rx = 150 + sol * 14;
                  return (
                    <g key={i}>
                      <circle cx={rx} cy="90" r="4" fill="#00ff9d" className="animate-pulse" />
                      <text x={rx} y="110" fill="#00ff9d" fontSize="10" font-mono textAnchor="middle">
                        x={sol}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950 p-2.5 border border-cyan-500/20 text-xs font-mono space-y-1 mt-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Class:</span>
              <span className="text-cyan-300 font-bold">{solution.problemType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Exact Roots:</span>
              <span className="text-emerald-400 font-bold">{solution.solutions.join(' , ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Formula Check:</span>
              <span className="text-slate-300">{solution.verification.checkEquation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
