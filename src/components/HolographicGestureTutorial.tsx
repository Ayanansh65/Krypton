import React, { useState, useRef, useEffect } from 'react';
import {
  Hand,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  Layers,
  RotateCw,
  ArrowRight,
  X,
  Volume2,
  VolumeX,
  Compass,
  Move,
  MousePointer,
  Radio,
  Eye,
  Sliders,
  Play,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { holoAudio } from '../utils/audioFeedback.ts';
import { HolographicPointerAura } from './HolographicPointerAura.tsx';

interface HolographicGestureTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPracticeInHUD?: () => void;
}

type TutorialStep = 'HOVER' | 'AIR_TAP' | 'GRAB' | 'COMPLETE';

export const HolographicGestureTutorial: React.FC<HolographicGestureTutorialProps> = ({
  isOpen,
  onClose,
  onLaunchPracticeInHUD,
}) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>('HOVER');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    HOVER: false,
    AIR_TAP: false,
    GRAB: false,
  });

  // Spatial arena tracking coordinates
  const arenaRef = useRef<HTMLDivElement>(null);
  const [pointerPos, setPointerPos] = useState({ x: 380, y: 240 });
  const [isPointerInArena, setIsPointerInArena] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  // Step 1: Hover Dwell state
  const [isHoveringTarget, setIsHoveringTarget] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0); // 0 to 1
  const dwellTimerRef = useRef<number | null>(null);

  // Step 2: Air-Tap state
  const [tapTriggered, setTapTriggered] = useState(false);
  const [tapShockwave, setTapShockwave] = useState(false);

  // Step 3: Spatial Grab state
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [grabStartPos, setGrabStartPos] = useState({ x: 0, y: 0 });
  const [draggedDistance, setDraggedDistance] = useState(0);
  const [crystalPos, setCrystalPos] = useState({ x: 0, y: 0 }); // relative offset from center

  // Audio mute state
  const [isMuted, setIsMuted] = useState(holoAudio.getMuted());

  // Reset or setup steps
  useEffect(() => {
    if (isOpen) {
      setDwellProgress(0);
      setTapTriggered(false);
      setTapShockwave(false);
      setIsGrabbed(false);
      setDraggedDistance(0);
      setCrystalPos({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle pointer movement within the interactive tutorial arena
  const handleArenaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointerPos({ x, y });
    setIsPointerInArena(true);

    // If grabbing the spatial crystal in Step 3
    if (isGrabbed && currentStep === 'GRAB') {
      const dx = x - grabStartPos.x;
      const dy = y - grabStartPos.y;
      setCrystalPos({ x: dx, y: dy });
      const dist = Math.hypot(dx, dy);
      setDraggedDistance((prev) => Math.max(prev, dist));

      // Threshold to complete grab step (120px of spatial manipulation)
      if (dist >= 120 && !completedSteps.GRAB) {
        setCompletedSteps((prev) => ({ ...prev, GRAB: true }));
        holoAudio.playGestureStepComplete();
      }
    }
  };

  // Step 1: Hover Dwell Counter Loop
  useEffect(() => {
    if (currentStep !== 'HOVER') return;

    if (isHoveringTarget && !completedSteps.HOVER) {
      holoAudio.playHoloHover();
      const startTime = performance.now();
      const DURATION = 1200; // 1.2s to calibrate dwell

      const updateDwell = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / DURATION);
        setDwellProgress(progress);

        if (progress < 1) {
          dwellTimerRef.current = requestAnimationFrame(updateDwell);
        } else {
          // Completed Hover Step!
          setCompletedSteps((prev) => ({ ...prev, HOVER: true }));
          holoAudio.playGestureStepComplete();
          setTimeout(() => {
            setCurrentStep('AIR_TAP');
            setDwellProgress(0);
            setIsHoveringTarget(false);
          }, 600);
        }
      };

      dwellTimerRef.current = requestAnimationFrame(updateDwell);
    } else {
      if (dwellTimerRef.current) {
        cancelAnimationFrame(dwellTimerRef.current);
      }
      setDwellProgress(0);
    }

    return () => {
      if (dwellTimerRef.current) cancelAnimationFrame(dwellTimerRef.current);
    };
  }, [isHoveringTarget, currentStep, completedSteps.HOVER]);

  // Step 2: Trigger Air-Tap Click
  const handlePerformAirTap = () => {
    if (currentStep !== 'AIR_TAP') return;

    setIsPinching(true);
    setTapTriggered(true);
    setTapShockwave(true);
    holoAudio.playHoloClick();

    setTimeout(() => {
      setIsPinching(false);
    }, 280);

    setTimeout(() => {
      setCompletedSteps((prev) => ({ ...prev, AIR_TAP: true }));
      holoAudio.playGestureStepComplete();
      setTimeout(() => {
        setCurrentStep('GRAB');
        setTapTriggered(false);
        setTapShockwave(false);
      }, 700);
    }, 450);
  };

  // Step 3: Grab and Drag Start
  const handleGrabDown = (e: React.MouseEvent) => {
    if (currentStep !== 'GRAB') return;
    setIsGrabbed(true);
    setIsPinching(true);
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    setGrabStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    holoAudio.playGrabEngage();
  };

  // Step 3: Grab Release
  const handleGrabUp = () => {
    if (currentStep !== 'GRAB') return;
    setIsGrabbed(false);
    setIsPinching(false);

    if (draggedDistance >= 120) {
      holoAudio.playGestureStepComplete();
      setTimeout(() => {
        handleTriggerCelebration();
      }, 500);
    }
  };

  // Final Celebration Trigger
  const handleTriggerCelebration = () => {
    setCurrentStep('COMPLETE');
    holoAudio.playTutorialComplete();

    // Trigger futuristic cyan and emerald confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00f3ff', '#00ff9d', '#ffffff', '#38bdf8', '#ffaa00'],
      });
    } catch {}
  };

  const handleResetTutorial = () => {
    setCompletedSteps({ HOVER: false, AIR_TAP: false, GRAB: false });
    setCurrentStep('HOVER');
    setDwellProgress(0);
    setTapTriggered(false);
    setTapShockwave(false);
    setIsGrabbed(false);
    setDraggedDistance(0);
    setCrystalPos({ x: 0, y: 0 });
    holoAudio.playHoloClick();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-2xl overflow-y-auto">
      {/* Outer Holographic Container */}
      <div className="relative w-full max-w-5xl rounded-3xl border-2 border-cyan-500/50 bg-slate-950/95 shadow-[0_0_50px_rgba(0,243,255,0.35)] overflow-hidden flex flex-col my-auto">
        {/* Hologram Scanlines & Corner Accents */}
        <div className="absolute inset-0 hologram-scanlines pointer-events-none opacity-50" />
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

        {/* Top Header Navigation */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-cyan-500/30 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-950/90 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,243,255,0.5)]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-hud text-sm md:text-base font-bold tracking-wider text-cyan-300">
                  HOLOGRAPHIC GESTURE CALIBRATION
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] font-mono text-cyan-400 border border-cyan-400/30">
                  INTERACTIVE SUITE
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                MASTER THE 3 CORE AIR-GESTURES · SPATIAL HOVER, AIR-TAP, & 3D GRAB
              </div>
            </div>
          </div>

          {/* Step Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-cyan-500/30">
            {[
              { id: 'HOVER' as TutorialStep, label: '01. Hover Dwell', icon: Eye },
              { id: 'AIR_TAP' as TutorialStep, label: '02. Air-Tap', icon: Zap },
              { id: 'GRAB' as TutorialStep, label: '03. Spatial Grab', icon: Move },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = completedSteps[step.id];

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    holoAudio.playHoloClick();
                    setCurrentStep(step.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-hud font-semibold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 border border-cyan-300 shadow-[0_0_12px_#00f3ff]'
                      : isDone
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-cyan-200'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Icon className="h-3.5 w-3.5" />}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Sound & Close Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                holoAudio.setMuted(next);
                if (!next) holoAudio.playHoloClick();
              }}
              className="holo-btn p-2 rounded-xl border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 bg-slate-900/80 transition-all"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onClose();
              }}
              className="holo-btn p-2 rounded-xl border border-red-500/30 text-red-300 hover:border-red-400 hover:bg-red-950/40 transition-all"
              title="Close Tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Tutorial Body (2 Columns: Guide & Arena) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left Column: Physical Posture Guide & Telemetry (4 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Gesture Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-5 backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                  PHYSICAL HAND POSTURE GUIDE
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  STEP {currentStep === 'HOVER' ? '1 OF 3' : currentStep === 'AIR_TAP' ? '2 OF 3' : currentStep === 'GRAB' ? '3 OF 3' : 'COMPLETE'}
                </span>
              </div>

              {/* Step 1: HOVER Guide */}
              {currentStep === 'HOVER' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-hud font-bold text-cyan-200">
                    Spatial Hover & Dwell Lock
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Keep your <strong>open palm facing the camera</strong> (or move your cursor in the arena).
                    Notice how the holographic target elevates toward you on the <strong>Z-axis (+24px)</strong> with
                    dynamic 3D parallax tilt.
                  </p>

                  {/* Vector SVG Hand Diagram - Open Palm Hover */}
                  <div className="h-36 w-full rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg viewBox="0 0 160 120" className="h-full w-auto">
                      {/* Radiating Radar Sensor Arcs */}
                      <circle cx="80" cy="55" r="28" fill="none" stroke="#00f3ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                      <circle cx="80" cy="55" r="42" fill="none" stroke="#00f3ff" strokeWidth="1" strokeDasharray="4 4" opacity="0.25" />
                      
                      {/* Stylized Open Palm Vector */}
                      <path
                        d="M60 85 C55 85 52 75 52 68 L52 48 C52 45 56 45 56 48 L56 64 M58 48 C58 43 64 43 64 48 L64 64 M66 45 C66 39 72 39 72 45 L72 64 M74 48 C74 44 80 44 80 48 L80 68 M82 60 C82 56 88 56 88 62 L88 74 C88 88 75 92 68 92 Z"
                        fill="rgba(0, 243, 255, 0.15)"
                        stroke="#00f3ff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-pulse"
                      />
                      
                      {/* Focused Beam Dot */}
                      <circle cx="80" cy="55" r="4" fill="#ffffff" filter="drop-shadow(0 0 6px #00f3ff)" />
                    </svg>

                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                      POSTURE: OPEN PALM
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-3 border border-cyan-500/20 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Z-Elevation:</span>
                      <span className="text-cyan-300">+24.0 mm (Outward Rise)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Dwell Requirement:</span>
                      <span className="text-amber-300">1.2s Steady Spatial Lock</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: AIR-TAP Guide */}
              {currentStep === 'AIR_TAP' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-hud font-bold text-emerald-300">
                    Air-Tap & Depth Plunge
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Bring your <strong>index finger and thumb together in a quick pinching gesture</strong> (or click the target).
                    The button visually plunges into the screen on the <strong>Z-axis (-34px)</strong>, triggering an emerald
                    micro-vibration and radial shockwave.
                  </p>

                  {/* Vector SVG Hand Diagram - Pinch / Air-Tap */}
                  <div className="h-36 w-full rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg viewBox="0 0 160 120" className="h-full w-auto">
                      {/* Pinch Convergence Spark */}
                      <circle cx="80" cy="46" r="6" fill="#00ff9d" opacity="0.6" className="animate-ping" />
                      <circle cx="80" cy="46" r="3" fill="#ffffff" />

                      {/* Stylized Pinching Hand Vector */}
                      <path
                        d="M58 85 C54 85 50 78 52 70 L60 52 C62 48 68 50 67 55 L63 68 M68 52 C71 45 78 45 78 50 L75 66 M78 50 C80 46 84 46 85 51 L81 68 M85 52 C87 49 92 50 91 55 L87 75 C85 86 74 90 66 90 Z"
                        fill="rgba(0, 255, 157, 0.15)"
                        stroke="#00ff9d"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Kinetic Energy Wave */}
                      <line x1="72" y1="46" x2="88" y2="46" stroke="#ffffff" strokeWidth="2" strokeDasharray="2 2" />
                    </svg>

                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      POSTURE: INDEX-THUMB PINCH
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-3 border border-emerald-500/20 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Actuation Depth:</span>
                      <span className="text-emerald-300">-34.0 mm (Deep Inset)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Damping Force:</span>
                      <span className="text-emerald-300">High-Freq Micro-Vibration</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: GRAB Guide */}
              {currentStep === 'GRAB' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-hud font-bold text-amber-300">
                    Spatial Grab & Tractor Lock
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    <strong>Pinch and hold (or hold-click)</strong> to lock a magnetic tractor beam onto the floating crystal.
                    Drag your hand across 3D space to reposition it, then release your fingers to disengage.
                  </p>

                  {/* Vector SVG Hand Diagram - Closed Grab Fist */}
                  <div className="h-36 w-full rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg viewBox="0 0 160 120" className="h-full w-auto">
                      {/* Magnetic Attraction Lines */}
                      <path d="M40 60 Q80 30 120 60" fill="none" stroke="#ffaa00" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                      <path d="M40 70 Q80 100 120 70" fill="none" stroke="#ffaa00" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                      {/* Stylized Clenched Fist / Grasp Hand */}
                      <path
                        d="M58 84 C54 84 50 78 52 70 L55 58 C56 54 62 54 62 58 L62 68 M63 56 C65 52 71 52 71 56 L71 68 M72 56 C74 52 80 52 80 56 L80 68 M81 58 C83 54 88 55 88 60 L87 75 C85 86 74 90 66 90 Z"
                        fill="rgba(255, 170, 0, 0.15)"
                        stroke="#ffaa00"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                      POSTURE: GRASP / PINCH-HOLD
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-xl p-3 border border-amber-500/20 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Tractor Status:</span>
                      <span className={isGrabbed ? 'text-amber-300 font-bold animate-pulse' : 'text-slate-400'}>
                        {isGrabbed ? 'LOCKED [9.8N MAGNETIC FORCE]' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Displacement Goal:</span>
                      <span className="text-amber-300">
                        {Math.round(draggedDistance)}px / 120px REQUIRED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete State */}
              {currentStep === 'COMPLETE' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-hud text-lg font-bold">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <span>Neural Link Established!</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    All core air gestures have been calibrated to your device. You can now control the entire
                    modular workspace hands-free through spatial air interaction.
                  </p>

                  <div className="space-y-2 bg-slate-950/80 rounded-xl p-3 border border-emerald-500/30 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>✓ 01. Spatial Hover Dwell</span>
                      <span>Calibrated (1.2s)</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>✓ 02. Air-Tap Depth Plunge</span>
                      <span>-34.0 mm Validated</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-300">
                      <span>✓ 03. 3D Spatial Grab</span>
                      <span>6-DOF Manipulator Online</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleResetTutorial}
                className="holo-btn px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-hud font-semibold text-slate-300 hover:text-cyan-200 transition-all flex items-center gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Reset Steps
              </button>

              {currentStep === 'COMPLETE' ? (
                <button
                  onClick={() => {
                    holoAudio.playHoloClick();
                    onClose();
                  }}
                  className="holo-depth-btn flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-hud font-bold text-xs shadow-[0_0_20px_#10b981] flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Enter Workspace
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (currentStep === 'HOVER') setCurrentStep('AIR_TAP');
                    else if (currentStep === 'AIR_TAP') setCurrentStep('GRAB');
                    else handleTriggerCelebration();
                    holoAudio.playHoloClick();
                  }}
                  className="holo-depth-btn flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-hud font-bold text-xs shadow-[0_0_15px_#00f3ff] flex items-center justify-center gap-2 transition-all"
                >
                  <span>Next Gesture</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: The Interactive Spatial Sandbox Arena (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div
              ref={arenaRef}
              onMouseMove={handleArenaMouseMove}
              onMouseLeave={() => setIsPointerInArena(false)}
              className="relative w-full h-[460px] rounded-2xl border-2 border-cyan-500/40 bg-slate-950 overflow-hidden select-none shadow-[0_0_35px_rgba(0,243,255,0.2)] cyber-grid holo-3d-layer flex items-center justify-center"
            >
              {/* Luminous Spatial Pointer Aura */}
              <HolographicPointerAura
                x={pointerPos.x}
                y={pointerPos.y}
                isActive={isPointerInArena}
                isPinching={isPinching}
                isHoveringButton={isHoveringTarget || isGrabbed}
              />

              {/* Top Arena Telemetry Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-cyan-400 z-30 pointer-events-none">
                <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-cyan-500/30 backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>INTERACTIVE AIR SANDBOX</span>
                </div>
                <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-cyan-500/30 backdrop-blur-md">
                  X: {Math.round(pointerPos.x)}px · Y: {Math.round(pointerPos.y)}px
                </div>
              </div>

              {/* STEP 1 ARENA: Hover Dwell Target */}
              {currentStep === 'HOVER' && (
                <div className="flex flex-col items-center justify-center space-y-6 z-20">
                  <div
                    onMouseEnter={() => setIsHoveringTarget(true)}
                    onMouseLeave={() => setIsHoveringTarget(false)}
                    className="relative cursor-pointer transition-all duration-200 perspective-spatial"
                  >
                    {/* SVG Radial Dwell Ring */}
                    <div className="absolute -inset-6 flex items-center justify-center pointer-events-none">
                      <svg className="w-32 h-32 -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="54"
                          stroke="rgba(0, 243, 255, 0.2)"
                          strokeWidth="3"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="54"
                          stroke="#00f3ff"
                          strokeWidth="4"
                          strokeDasharray={2 * Math.PI * 54}
                          strokeDashoffset={2 * Math.PI * 54 * (1 - dwellProgress)}
                          fill="none"
                          strokeLinecap="round"
                          className="transition-all duration-75"
                          filter="drop-shadow(0 0 8px #00f3ff)"
                        />
                      </svg>
                    </div>

                    {/* 3D Elevated Holographic Node */}
                    <div
                      className={`relative w-28 h-28 rounded-3xl flex flex-col items-center justify-center p-3 border-2 transition-all duration-200 backdrop-blur-xl ${
                        isHoveringTarget
                          ? 'border-cyan-300 bg-cyan-950/80 shadow-[0_0_35px_rgba(0,243,255,0.7),inset_0_0_20px_rgba(0,243,255,0.3)]'
                          : 'border-cyan-500/40 bg-slate-900/80 hover:border-cyan-400'
                      }`}
                      style={{
                        transform: isHoveringTarget
                          ? 'perspective(1000px) translateZ(28px) scale(1.08)'
                          : 'perspective(1000px) translateZ(0) scale(1)',
                      }}
                    >
                      <Target
                        className={`h-10 w-10 text-cyan-300 transition-transform duration-200 ${
                          isHoveringTarget ? 'scale-115 rotate-45 text-white' : ''
                        }`}
                      />
                      <span className="font-hud text-[11px] font-bold text-cyan-200 mt-2">
                        HOVER HERE
                      </span>
                      <span className="font-mono text-[9px] text-cyan-400/80">
                        {Math.round(dwellProgress * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center font-mono text-xs text-cyan-300 bg-slate-950/80 px-4 py-1.5 rounded-full border border-cyan-500/40 backdrop-blur-md">
                    {isHoveringTarget
                      ? `CALIBRATING DWELL: ${Math.round(dwellProgress * 100)}% · HOLD STEADY`
                      : 'MOVE HAND / CURSOR OVER THE MATRIX CORE'}
                  </div>
                </div>
              )}

              {/* STEP 2 ARENA: Air-Tap Button */}
              {currentStep === 'AIR_TAP' && (
                <div className="flex flex-col items-center justify-center space-y-6 z-20">
                  <div
                    onClick={handlePerformAirTap}
                    className="relative cursor-pointer transition-all duration-150 perspective-spatial group"
                  >
                    {/* Radial Holographic Shockwave Ring on Tap */}
                    {tapShockwave && (
                      <div className="absolute -inset-8 rounded-3xl border-2 border-emerald-400 animate-shockwave pointer-events-none" />
                    )}

                    {/* 3D Depth Shift Button */}
                    <div
                      className={`relative px-8 py-5 rounded-2xl flex items-center gap-4 border-2 transition-all select-none backdrop-blur-xl ${
                        tapTriggered
                          ? 'animate-micro-vibrate border-emerald-400 bg-emerald-950/90 shadow-[0_0_40px_rgba(0,255,157,0.9),inset_0_0_20px_rgba(0,255,157,0.6)]'
                          : 'border-emerald-500/50 bg-slate-900/80 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(0,255,157,0.5)]'
                      }`}
                      style={{
                        transform: tapTriggered
                          ? 'perspective(1000px) translateZ(-34px) scale(0.92)'
                          : 'perspective(1000px) translateZ(18px) scale(1.05)',
                        transition: tapTriggered ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300">
                        <Zap className="h-6 w-6" />
                      </div>

                      <div className="text-left">
                        <div className="text-sm font-hud font-bold text-emerald-200">
                          PERFORM AIR-TAP
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400/80">
                          Pinch fingers together (or click)
                        </div>
                      </div>

                      <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        {tapTriggered ? '-34mm' : '+18mm'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center font-mono text-xs text-emerald-300 bg-slate-950/80 px-4 py-1.5 rounded-full border border-emerald-500/40 backdrop-blur-md">
                    {tapTriggered ? 'ACTUATION DETECTED · SHOCKWAVE FIRED' : 'CLICK OR AIR-PINCH THE EMERALD MATRIX'}
                  </div>
                </div>
              )}

              {/* STEP 3 ARENA: Spatial Grab Wireframe Crystal */}
              {currentStep === 'GRAB' && (
                <div
                  onMouseDown={handleGrabDown}
                  onMouseUp={handleGrabUp}
                  className="w-full h-full relative flex items-center justify-center z-20"
                >
                  {/* Floating Holographic Crystal (Positioned with crystalPos) */}
                  <div
                    className={`absolute cursor-grab active:cursor-grabbing transition-transform duration-75 perspective-spatial ${
                      isGrabbed ? 'cursor-grabbing z-30' : ''
                    }`}
                    style={{
                      transform: `translate(${crystalPos.x}px, ${crystalPos.y}px)`,
                    }}
                  >
                    {/* Magnetic Tractor Beam lines to Pointer */}
                    {isGrabbed && (
                      <svg className="absolute -top-64 -left-64 w-[500px] h-[500px] pointer-events-none">
                        <line
                          x1="250"
                          y1="250"
                          x2={250 - crystalPos.x + (pointerPos.x - 380)}
                          y2={250 - crystalPos.y + (pointerPos.y - 240)}
                          stroke="#ffaa00"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          className="animate-pulse"
                        />
                      </svg>
                    )}

                    {/* 3D Polyhedral Wireframe Card */}
                    <div
                      className={`relative w-36 h-36 rounded-3xl border-2 flex flex-col items-center justify-center p-3 backdrop-blur-xl select-none transition-all ${
                        isGrabbed
                          ? 'border-amber-400 bg-amber-950/90 shadow-[0_0_35px_rgba(255,170,0,0.8),inset_0_0_20px_rgba(255,170,0,0.4)] scale-110'
                          : 'border-amber-500/50 bg-slate-900/80 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(255,170,0,0.4)]'
                      }`}
                    >
                      <Move className="h-10 w-10 text-amber-300 animate-spin-slow" />
                      <span className="font-hud text-xs font-bold text-amber-200 mt-2">
                        {isGrabbed ? 'LOCKED' : 'GRAB ME'}
                      </span>
                      <span className="font-mono text-[10px] text-amber-400/80">
                        {Math.round(draggedDistance)}px / 120px
                      </span>
                    </div>
                  </div>

                  {/* Instructions Footer in Arena */}
                  <div className="absolute bottom-4 text-center font-mono text-xs text-amber-300 bg-slate-950/80 px-4 py-1.5 rounded-full border border-amber-500/40 backdrop-blur-md">
                    {isGrabbed
                      ? `TRACTOR BEAM ACTIVE · DRAGGING (${Math.round(draggedDistance)}px / 120px)`
                      : 'PINCH & HOLD OR MOUSE DOWN TO GRAB AND DRAG'}
                  </div>
                </div>
              )}

              {/* STEP 4 ARENA: Calibration Complete Screen */}
              {currentStep === 'COMPLETE' && (
                <div className="flex flex-col items-center justify-center space-y-4 z-20 text-center p-6">
                  <div className="h-20 w-20 rounded-full bg-emerald-950/90 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_40px_#10b981] animate-pulse">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                  </div>
                  <h2 className="text-xl font-hud font-bold text-emerald-200">
                    AIR GESTURE TUTORIAL COMPLETE
                  </h2>
                  <p className="text-xs font-mono text-slate-300 max-w-md">
                    You have mastered Spatial Hover, Air-Tap, and 3D Grab. Ready to manipulate geometric models
                    and air-drawn diagrams in Krypton Vision AI.
                  </p>
                  <button
                    onClick={() => {
                      holoAudio.playHoloClick();
                      onClose();
                    }}
                    className="holo-depth-btn px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-hud font-bold text-xs shadow-[0_0_20px_#10b981]"
                  >
                    Launch Workspace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
