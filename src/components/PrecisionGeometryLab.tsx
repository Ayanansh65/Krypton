import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Maximize2,
  BookmarkPlus,
  Sliders,
  Scale,
} from 'lucide-react';
import {
  Point2D,
  analyzeTriangle,
  analyzePolygon,
  distance,
  calculateShoelaceArea,
  analyzeCircle,
} from '../utils/geometry.ts';
import {
  verifyTriangle,
  computeCalibration,
  KNOWN_CALIBRATION_STANDARDS,
  CalibrationResult,
} from '../utils/selfChecking.ts';
import { holoAudio } from '../utils/audioFeedback.ts';

interface PrecisionGeometryLabProps {
  onSaveToNotebook?: (entry: {
    title: string;
    type: string;
    details: string;
    metrics: any;
  }) => void;
  airDrawPoints?: Point2D[];
}

export const PrecisionGeometryLab: React.FC<PrecisionGeometryLabProps> = ({
  onSaveToNotebook,
  airDrawPoints,
}) => {
  const [points, setPoints] = useState<Point2D[]>([
    { x: 120, y: 280, label: 'A' },
    { x: 380, y: 280, label: 'B' },
    { x: 250, y: 80, label: 'C' },
  ]);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [selectedStandard, setSelectedStandard] = useState(KNOWN_CALIBRATION_STANDARDS[0]);
  const [calibration, setCalibration] = useState<CalibrationResult>(
    computeCalibration(85.6, 260, 1.5)
  );
  const [showIncircle, setShowIncircle] = useState(true);
  const [showCircumcircle, setShowCircumcircle] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // If external air-drawn points are passed in, adopt them
  useEffect(() => {
    if (airDrawPoints && airDrawPoints.length >= 3) {
      setPoints(
        airDrawPoints.slice(0, 8).map((p, i) => ({
          x: p.x,
          y: p.y,
          label: String.fromCharCode(65 + i),
        }))
      );
    }
  }, [airDrawPoints]);

  // Triangle analysis and self-checking
  const isTriangle = points.length === 3;
  const triangleVerification = isTriangle
    ? verifyTriangle(points[0], points[1], points[2])
    : null;

  // General polygon analysis
  const polygonMetrics = points.length >= 3 ? analyzePolygon(points) : null;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    if (points.length < 8) {
      holoAudio.playAirDraw();
      const nextLabel = String.fromCharCode(65 + points.length);
      setPoints([...points, { x, y, label: nextLabel }]);
    }
  };

  const handlePointDrag = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPointIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedPointIndex === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
    let y = Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top));

    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    const updated = [...points];
    updated[selectedPointIndex] = {
      ...updated[selectedPointIndex],
      x,
      y,
    };
    setPoints(updated);
  };

  const handleMouseUp = () => {
    if (selectedPointIndex !== null) {
      holoAudio.playHoloClick();
      setSelectedPointIndex(null);
    }
  };

  const loadPreset = (preset: 'EQUILATERAL' | 'RIGHT_TRIANGLE' | 'GOLDEN_RECT' | 'HEXAGON') => {
    holoAudio.playHoloClick();
    if (preset === 'RIGHT_TRIANGLE') {
      setPoints([
        { x: 120, y: 320, label: 'A' },
        { x: 360, y: 320, label: 'B' },
        { x: 120, y: 140, label: 'C' },
      ]);
    } else if (preset === 'EQUILATERAL') {
      setPoints([
        { x: 140, y: 300, label: 'A' },
        { x: 380, y: 300, label: 'B' },
        { x: 260, y: 92.15, label: 'C' },
      ]);
    } else if (preset === 'GOLDEN_RECT') {
      setPoints([
        { x: 120, y: 120, label: 'A' },
        { x: 380, y: 120, label: 'B' },
        { x: 380, y: 280, label: 'C' },
        { x: 120, y: 280, label: 'D' },
      ]);
    } else if (preset === 'HEXAGON') {
      const cx = 250;
      const cy = 200;
      const r = 110;
      const hex: Point2D[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        hex.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          label: String.fromCharCode(65 + i),
        });
      }
      setPoints(hex);
    }
  };

  const handleSave = () => {
    if (!onSaveToNotebook) return;
    holoAudio.playVerifySuccess();
    onSaveToNotebook({
      title: isTriangle ? 'Triangle Metric Analysis' : 'Planar Polygon Survey',
      type: 'GEOMETRY_SELF_CHECK',
      details: isTriangle
        ? `Sides: [${triangleVerification?.metrics.sides.map((s) => (s / calibration.pixelsPerMillimeter).toFixed(1)).join(', ')} mm]. Angles: [${triangleVerification?.metrics.anglesDeg.map((a) => a.toFixed(1)).join('°, ')}°]. Dual area residual: ${triangleVerification?.checks[1].residual.toFixed(3)}.`
        : `Vertex Count: ${points.length}, Perimeter: ${(polygonMetrics?.perimeter! / calibration.pixelsPerMillimeter).toFixed(1)} mm, Area: ${(polygonMetrics?.area! / (calibration.pixelsPerMillimeter ** 2)).toFixed(1)} mm².`,
      metrics: isTriangle ? triangleVerification?.metrics : polygonMetrics,
    });
  };

  // Convert px to mm using calibration
  const toMm = (px: number) => (px / calibration.pixelsPerMillimeter).toFixed(1);
  const toMmSq = (pxSq: number) =>
    (pxSq / (calibration.pixelsPerMillimeter * calibration.pixelsPerMillimeter)).toFixed(1);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 backdrop-blur-md">
      {/* Interactive Precision Coordinate Canvas */}
      <div className="relative flex-1 rounded-xl border border-cyan-500/40 bg-slate-950 overflow-hidden flex flex-col justify-between min-h-[420px]">
        {/* Top canvas telemetry overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 rounded bg-slate-950/85 px-2.5 py-1 text-xs font-hud text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>PRECISION GEOMETRY CANVAS // COORD SYSTEM</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-950/85 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 backdrop-blur-md">
              1 mm = {calibration.pixelsPerMillimeter.toFixed(2)} px
            </span>
            <span className="rounded bg-slate-950/85 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
              UNCERTAINTY: ±{calibration.physicalUncertaintyMm.toFixed(2)} mm
            </span>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <svg
          ref={svgRef}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full cursor-crosshair select-none"
          style={{ minHeight: '380px' }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="coordGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="rgba(0, 243, 255, 0.08)"
                strokeWidth="1"
              />
            </pattern>
            {/* Major Grid Pattern */}
            <pattern
              id="majorGrid"
              width={gridSize * 5}
              height={gridSize * 5}
              patternUnits="userSpaceOnUse"
            >
              <rect width={gridSize * 5} height={gridSize * 5} fill="url(#coordGrid)" />
              <path
                d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
                fill="none"
                stroke="rgba(0, 243, 255, 0.2)"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="100%" height="100%" fill="url(#majorGrid)" />

          {/* Polygon / Triangle Outline and Fill */}
          {points.length >= 3 && (
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(0, 243, 255, 0.12)"
              stroke="#00f3ff"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="filter drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]"
            />
          )}

          {/* Lines if 2 points */}
          {points.length === 2 && (
            <line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[1].x}
              y2={points[1].y}
              stroke="#00f3ff"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          )}

          {/* Triangle Incircle & Circumcircle Overlays */}
          {isTriangle && triangleVerification && (
            <>
              {showCircumcircle && triangleVerification.metrics.circumradius < 300 && (
                <circle
                  cx={triangleVerification.metrics.centroid.x}
                  cy={triangleVerification.metrics.centroid.y}
                  r={triangleVerification.metrics.circumradius}
                  fill="none"
                  stroke="#ffaa00"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.45"
                />
              )}
              {showIncircle && (
                <circle
                  cx={triangleVerification.metrics.centroid.x}
                  cy={triangleVerification.metrics.centroid.y}
                  r={triangleVerification.metrics.inradius}
                  fill="rgba(0, 255, 157, 0.05)"
                  stroke="#00ff9d"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
              )}
            </>
          )}

          {/* Segment lengths & mid-point tags */}
          {points.map((p, i) => {
            const nextP = points[(i + 1) % points.length];
            if (points.length < 2 || (points.length === 2 && i === 1)) return null;
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            const lenPx = distance(p, nextP);
            const lenMm = toMm(lenPx);

            return (
              <g key={`len-${i}`} className="pointer-events-none">
                <rect
                  x={midX - 28}
                  y={midY - 10}
                  width="56"
                  height="20"
                  rx="4"
                  fill="#030712"
                  stroke="#00f3ff"
                  strokeWidth="0.8"
                  opacity="0.85"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  fill="#00f3ff"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {lenMm} mm
                </text>
              </g>
            );
          })}

          {/* Interactive Vertex Handles */}
          {points.map((p, i) => (
            <g
              key={`vertex-${i}`}
              onMouseDown={(e) => handlePointDrag(i, e)}
              className="cursor-move"
            >
              {/* Outer glowing halo */}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="none"
                stroke="#00f3ff"
                strokeWidth="1.5"
                opacity="0.5"
                className="hover:scale-125 transition-all"
              />
              {/* Core Handle */}
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#00f3ff"
                className="filter drop-shadow-[0_0_6px_#00f3ff]"
              />
              {/* Label Tag */}
              <text
                x={p.x + 12}
                y={p.y - 8}
                fill="#ffffff"
                fontSize="12"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Bottom toolbar */}
        <div className="p-3 bg-slate-900/90 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-hud text-slate-300">PRESETS:</span>
            <button
              onClick={() => loadPreset('EQUILATERAL')}
              className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-hud border border-cyan-500/20"
            >
              Equilateral Δ
            </button>
            <button
              onClick={() => loadPreset('RIGHT_TRIANGLE')}
              className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-hud border border-cyan-500/20"
            >
              3-4-5 Right Δ
            </button>
            <button
              onClick={() => loadPreset('GOLDEN_RECT')}
              className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-hud border border-cyan-500/20"
            >
              Rectangle
            </button>
            <button
              onClick={() => loadPreset('HEXAGON')}
              className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-hud border border-cyan-500/20"
            >
              Hexagon
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                setPoints([]);
              }}
              className="holo-depth-btn px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-hud border border-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
              Reset Canvas
            </button>
            <button
              onClick={handleSave}
              className="holo-depth-btn px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-hud font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(0,243,255,0.4)]"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Log to Notebook
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Mathematical Analysis & Self-Checking Engine */}
      <div className="w-full lg:w-96 flex flex-col gap-3">
        {/* Verification Checks Panel */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-hud font-bold text-cyan-300">
                SELF-CHECKING VERIFICATION ENGINE
              </span>
            </div>
            {triangleVerification && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  triangleVerification.allPassed
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                }`}
              >
                {triangleVerification.allPassed ? 'ALL IDENTITIES PASSED' : 'TOLERANCE DEVIATION'}
              </span>
            )}
          </div>

          {triangleVerification ? (
            <div className="space-y-2">
              {triangleVerification.checks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-lg bg-slate-950/70 p-2.5 border border-cyan-500/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-hud font-bold text-slate-200">
                      {check.name}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-mono ${
                        check.passed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {check.passed ? 'VERIFIED' : 'UNCERTAIN'}
                    </span>
                  </div>

                  <div className="mt-1 font-mono text-[11px] text-cyan-300">
                    Formula: <span className="text-slate-300">{check.formulaDescription}</span>
                  </div>

                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-400">
                    <span>
                      Residual: {check.residual.toFixed(4)} {check.unit}
                    </span>
                    <span>Tolerance: ≤ {check.tolerance}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              Draw at least 3 points to activate the dual-path self-checking identity validator.
            </div>
          )}
        </div>

        {/* Calculated Geometric Quantities */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <span className="text-xs font-hud font-bold text-cyan-300 block mb-2">
            PRECISE MEASUREMENTS (MM & DEG)
          </span>

          {isTriangle && triangleVerification ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded bg-slate-950 p-2 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">SIDE a (BC)</span>
                  <span className="text-cyan-300 font-bold">
                    {toMm(triangleVerification.metrics.sides[0])} mm
                  </span>
                </div>
                <div className="rounded bg-slate-950 p-2 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">SIDE b (AC)</span>
                  <span className="text-cyan-300 font-bold">
                    {toMm(triangleVerification.metrics.sides[1])} mm
                  </span>
                </div>
                <div className="rounded bg-slate-950 p-2 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">SIDE c (AB)</span>
                  <span className="text-cyan-300 font-bold">
                    {toMm(triangleVerification.metrics.sides[2])} mm
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded bg-slate-950 p-1.5 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">ANGLE A</span>
                  <span className="text-emerald-400 font-bold">
                    {triangleVerification.metrics.anglesDeg[0].toFixed(1)}°
                  </span>
                </div>
                <div className="rounded bg-slate-950 p-1.5 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">ANGLE B</span>
                  <span className="text-emerald-400 font-bold">
                    {triangleVerification.metrics.anglesDeg[1].toFixed(1)}°
                  </span>
                </div>
                <div className="rounded bg-slate-950 p-1.5 border border-cyan-500/20">
                  <span className="text-[10px] text-slate-400 block">ANGLE C</span>
                  <span className="text-emerald-400 font-bold">
                    {triangleVerification.metrics.anglesDeg[2].toFixed(1)}°
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 p-2.5 border border-cyan-500/20 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Perimeter:</span>
                  <span className="text-cyan-300 font-bold">
                    {toMm(triangleVerification.metrics.perimeter)} mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shoelace Planar Area:</span>
                  <span className="text-cyan-300 font-bold">
                    {toMmSq(triangleVerification.metrics.areaShoelace)} mm²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heron Dual Area:</span>
                  <span className="text-emerald-400 font-bold">
                    {toMmSq(triangleVerification.metrics.areaHeron)} mm²
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">
              Vertices: {points.length} | Perimeter: {polygonMetrics ? toMm(polygonMetrics.perimeter) : 0} mm | Area: {polygonMetrics ? toMmSq(polygonMetrics.area) : 0} mm²
            </div>
          )}
        </div>

        {/* Optical Reference Calibration */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-hud font-bold text-cyan-300 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-cyan-400" />
              PHYSICAL CALIBRATION STANDARD
            </span>
          </div>

          <select
            value={selectedStandard.id}
            onChange={(e) => {
              const std = KNOWN_CALIBRATION_STANDARDS.find((s) => s.id === e.target.value);
              if (std) {
                setSelectedStandard(std);
                setCalibration(computeCalibration(std.realMm, 260, 1.5));
              }
            }}
            className="w-full rounded bg-slate-950 border border-cyan-500/30 p-2 text-xs text-cyan-200 focus:outline-none"
          >
            {KNOWN_CALIBRATION_STANDARDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.realMm} mm)
              </option>
            ))}
          </select>

          <div className="mt-2 text-[11px] font-mono text-slate-400 flex justify-between">
            <span>Confidence Index:</span>
            <span className="text-emerald-400 font-bold">{calibration.confidencePercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
