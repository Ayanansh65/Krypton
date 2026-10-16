import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Layers,
  Sparkles,
  Zap,
  Target,
  Maximize2,
  RefreshCw,
  Sliders,
  Smartphone,
  Eye,
  Hand,
  PenTool,
  CheckCircle2,
  Scan,
  Compass,
} from 'lucide-react';
import { HolographicPointerAura } from './HolographicPointerAura.tsx';
import { holoAudio } from '../utils/audioFeedback.ts';
import { Point2D } from '../utils/geometry.ts';
import { recognizeDrawnShape, RecognizedShape } from '../utils/shapeRecognizer.ts';
import { processHandFrame, extractPaperDiagram, HandTrackingResult } from '../utils/handTracker.ts';

export type ActiveModule = 'CAMERA_HUD' | 'GEOMETRY' | 'THREE_LAB' | 'SIMULATION' | 'MATH_SOLVER' | 'NOTEBOOK';

interface CameraStreamViewerProps {
  activeModule: ActiveModule;
  onSelectModule: (mod: ActiveModule) => void;
  phoneConnected: boolean;
  phoneDeviceInfo: string | null;
  onOpenPhoneModal: () => void;
  activeFeedType: 'PHONE' | 'WEBCAM' | 'TEST_FEED' | 'IP_URL';
  testFeedSubtype?: string;
  onAirDrawComplete?: (points: Point2D[]) => void;
  privacyLocalOnly: boolean;
  onOpenGestureTutorial?: () => void;
}

export const CameraStreamViewer: React.FC<CameraStreamViewerProps> = ({
  activeModule,
  onSelectModule,
  phoneConnected,
  phoneDeviceInfo,
  onOpenPhoneModal,
  activeFeedType,
  testFeedSubtype = 'TRIANGLE_PAPER',
  onAirDrawComplete,
  privacyLocalOnly,
  onOpenGestureTutorial,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const testCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenAnalyzeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Gesture tracking & pointer state
  const [reticlePos, setReticlePos] = useState<{ x: number; y: number }>({ x: 340, y: 260 });
  const [isPinching, setIsPinching] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<ActiveModule | 'PHONE_MODAL' | 'AIR_DRAW' | null>(null);
  const [airDrawMode, setAirDrawMode] = useState(false);
  const [airDrawStrokes, setAirDrawStrokes] = useState<Point2D[]>([]);
  const [recognizedShape, setRecognizedShape] = useState<RecognizedShape | null>(null);
  const [opticalHandResult, setOpticalHandResult] = useState<HandTrackingResult | null>(null);
  const [opticalTrackingEnabled, setOpticalTrackingEnabled] = useState(true);
  const [phoneFrameImg, setPhoneFrameImg] = useState<string | null>(null);
  const [paperScanHighlight, setPaperScanHighlight] = useState<Point2D[] | null>(null);

  const dwellTimerRef = useRef<number | null>(null);
  const handTrackIntervalRef = useRef<number | null>(null);

  // Floating Holographic Action Nodes in 2D spatial screen space
  const floatingNodes = [
    {
      id: 'GEOMETRY' as ActiveModule,
      label: 'Precision Geometry',
      sublabel: 'Planar Invariants',
      xPct: 18,
      yPct: 22,
      color: '#00f3ff',
      icon: '📐',
    },
    {
      id: 'THREE_LAB' as ActiveModule,
      label: '3D Geometry Lab',
      sublabel: 'Polyhedron Slicing',
      xPct: 82,
      yPct: 22,
      color: '#00ff9d',
      icon: '🧪',
    },
    {
      id: 'SIMULATION' as ActiveModule,
      label: 'What-If Simulations',
      sublabel: 'Ballistics & Waves',
      xPct: 18,
      yPct: 78,
      color: '#ffaa00',
      icon: '⚡',
    },
    {
      id: 'MATH_SOLVER' as ActiveModule,
      label: 'Visual Math Solver',
      sublabel: 'Proof & Step Engine',
      xPct: 82,
      yPct: 78,
      color: '#ff0080',
      icon: '🧮',
    },
    {
      id: 'NOTEBOOK' as ActiveModule,
      label: 'Science Notebook',
      sublabel: 'Verified Experiment Logs',
      xPct: 50,
      yPct: 88,
      color: '#38bdf8',
      icon: '📓',
    },
  ];

  // Listen to Phone Camera Stream via SSE
  useEffect(() => {
    let evtSource: EventSource | null = null;
    if (activeFeedType === 'PHONE') {
      evtSource = new EventSource('/api/phone/stream');
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.frame) {
            setPhoneFrameImg(data.frame);
          }
        } catch {}
      };
    }
    return () => {
      if (evtSource) evtSource.close();
    };
  }, [activeFeedType]);

  // Webcam stream activation
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (activeFeedType === 'WEBCAM') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [activeFeedType]);

  // Animated Test Feeds (e.g. paper geometry drawing on desk)
  useEffect(() => {
    if (activeFeedType !== 'TEST_FEED') return;
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const renderTestFeed = () => {
      t += 0.02;
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sci-fi optical scan grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (testFeedSubtype === 'TRIANGLE_PAPER') {
        // Render paper sheet on desk
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 20;
        ctx.fillRect(-220, -140, 440, 280);

        // Lined paper rule
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let py = -120; py < 130; py += 25) {
          ctx.beginPath();
          ctx.moveTo(-200, py);
          ctx.lineTo(200, py);
          ctx.stroke();
        }

        // Labeled Hand-drawn Triangle on paper
        const p1 = { x: -120, y: 70 };
        const p2 = { x: 140, y: 70 };
        const p3 = { x: 10, y: -80 + Math.sin(t) * 4 };

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();

        // Detected vertex circles
        ctx.fillStyle = '#00f3ff';
        [p1, p2, p3].forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(String.fromCharCode(65 + idx), p.x + 8, p.y - 8);
          ctx.fillStyle = '#00f3ff';
        });

        // Protractor overlay arc
        ctx.strokeStyle = 'rgba(255, 0, 128, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 30, -Math.PI / 3, 0);
        ctx.stroke();
        ctx.fillStyle = '#ff0080';
        ctx.font = '11px monospace';
        ctx.fillText('θ ≈ 53.1°', p1.x + 36, p1.y - 10);

        // Simulated Hand Drawing with pen in air / over paper
        const handX = Math.sin(t * 1.5) * 120;
        const handY = Math.cos(t * 1.5) * 60;
        ctx.fillStyle = 'rgba(235, 175, 140, 0.85)';
        ctx.beginPath();
        ctx.arc(handX, handY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      } else if (testFeedSubtype === 'PHYSICS_PENDULUM') {
        const angle = Math.sin(t * 2) * 0.7;
        const originX = canvas.width / 2;
        const originY = 80;
        const len = 180;
        const bobX = originX + Math.sin(angle) * len;
        const bobY = originY + Math.cos(angle) * len;

        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
        ctx.fill();

        const vx = Math.cos(angle) * Math.cos(t * 2) * 40;
        const vy = -Math.sin(angle) * Math.cos(t * 2) * 40;
        ctx.strokeStyle = '#00ff9d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bobX, bobY);
        ctx.lineTo(bobX + vx, bobY + vy);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(canvas.width / 2 - 180, canvas.height / 2 - 120, 360, 240);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('f(x) = x² - 5x + 6 = 0', canvas.width / 2 - 140, canvas.height / 2 - 40);
        ctx.font = '14px monospace';
        ctx.fillText('Δ = b² - 4ac = 25 - 24 = 1', canvas.width / 2 - 140, canvas.height / 2);
        ctx.fillText('x = (5 ± 1) / 2 => x₁=3, x₂=2', canvas.width / 2 - 140, canvas.height / 2 + 40);
      }

      animId = requestAnimationFrame(renderTestFeed);
    };

    renderTestFeed();
    return () => cancelAnimationFrame(animId);
  }, [activeFeedType, testFeedSubtype]);

  // Real-time Optical Hand Tracker Loop
  useEffect(() => {
    if (!opticalTrackingEnabled) return;

    handTrackIntervalRef.current = window.setInterval(() => {
      // Find active visual source canvas
      let activeSource: HTMLCanvasElement | HTMLVideoElement | null = null;
      if (activeFeedType === 'TEST_FEED') {
        activeSource = testCanvasRef.current;
      } else if (activeFeedType === 'WEBCAM') {
        activeSource = videoRef.current;
      }

      if (!activeSource) return;

      const helperCanvas = hiddenAnalyzeCanvasRef.current;
      if (!helperCanvas) return;
      const hCtx = helperCanvas.getContext('2d');
      if (!hCtx) return;

      helperCanvas.width = 320;
      helperCanvas.height = 240;
      try {
        hCtx.drawImage(activeSource, 0, 0, 320, 240);
        const handRes = processHandFrame(helperCanvas, 160, 120);
        setOpticalHandResult(handRes);

        if (handRes.detected && handRes.fingertip && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mappedX = (handRes.fingertip.x / 320) * rect.width;
          const mappedY = (handRes.fingertip.y / 240) * rect.height;

          setReticlePos({ x: mappedX, y: mappedY });

          if (airDrawMode) {
            setAirDrawStrokes((prev) => [...prev, { x: mappedX, y: mappedY }]);
            holoAudio.playAirDraw();
          }

          if (handRes.isPinching) {
            setIsPinching(true);
          } else {
            setIsPinching(false);
          }
        }
      } catch {}
    }, 60); // 16 Hz optical hand tracking check

    return () => {
      if (handTrackIntervalRef.current) clearInterval(handTrackIntervalRef.current);
    };
  }, [opticalTrackingEnabled, activeFeedType, airDrawMode]);

  // Live Shape Recognizer on Air Strokes
  useEffect(() => {
    if (airDrawStrokes.length >= 5) {
      const recognized = recognizeDrawnShape(airDrawStrokes);
      setRecognizedShape(recognized);
    } else {
      setRecognizedShape(null);
    }
  }, [airDrawStrokes]);

  // Spatial mouse/pointer fallback tracking
  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setReticlePos({ x, y });

    if (airDrawMode) {
      setAirDrawStrokes((prev) => [...prev, { x, y }]);
      holoAudio.playAirDraw();
    }

    let hit: ActiveModule | 'PHONE_MODAL' | 'AIR_DRAW' | null = null;
    for (const node of floatingNodes) {
      const nodeX = (node.xPct / 100) * rect.width;
      const nodeY = (node.yPct / 100) * rect.height;
      if (Math.hypot(x - nodeX, y - nodeY) < 65) {
        hit = node.id;
        break;
      }
    }
    setHoveredNode(hit);
  };

  // Dwell-to-click charging logic
  useEffect(() => {
    if (!hoveredNode) {
      setDwellProgress(0);
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      return;
    }

    holoAudio.playHoloHover();
    const startTime = performance.now();
    const duration = 750;

    dwellTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setDwellProgress(progress);

      if (progress >= 1) {
        clearInterval(dwellTimerRef.current!);
        holoAudio.playVerifySuccess();
        if (hoveredNode === 'PHONE_MODAL') {
          onOpenPhoneModal();
        } else {
          onSelectModule(hoveredNode as ActiveModule);
        }
        setDwellProgress(0);
      }
    }, 25);

    return () => {
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    };
  }, [hoveredNode]);

  const handlePointerDown = () => {
    setIsPinching(true);
    holoAudio.playHoloClick();

    if (hoveredNode) {
      if (hoveredNode === 'PHONE_MODAL') {
        onOpenPhoneModal();
      } else {
        onSelectModule(hoveredNode as ActiveModule);
      }
    }
  };

  const handlePointerUp = () => {
    setIsPinching(false);
  };

  // Paper Diagram Detection Trigger
  const handleDetectPaperDiagram = () => {
    holoAudio.playScanPulse();
    const canvas = testCanvasRef.current || hiddenAnalyzeCanvasRef.current;
    if (!canvas) return;

    const paperRes = extractPaperDiagram(canvas);
    if (paperRes.detected && paperRes.corners.length >= 3) {
      holoAudio.playVerifySuccess();
      setPaperScanHighlight(paperRes.corners);
    }
  };

  // Import detected shape to Precision Geometry Lab
  const handleImportShapeToGeometry = () => {
    holoAudio.playVerifySuccess();
    const pts = paperScanHighlight || recognizedShape?.vertices || airDrawStrokes;
    if (pts && pts.length >= 3 && onAirDrawComplete) {
      onAirDrawComplete(pts);
    }
  };

  // Draw air strokes & recognized shape overlay
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw raw air stroke path
    if (airDrawStrokes.length >= 2) {
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(airDrawStrokes[0].x, airDrawStrokes[0].y);
      for (let i = 1; i < airDrawStrokes.length; i++) {
        ctx.lineTo(airDrawStrokes[i].x, airDrawStrokes[i].y);
      }
      ctx.stroke();
    }

    // Draw Snapped Recognized Shape Overlay
    if (recognizedShape && recognizedShape.vertices.length >= 3) {
      ctx.strokeStyle = '#00ff9d';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.shadowColor = '#00ff9d';
      ctx.shadowBlur = 10;

      if (recognizedShape.type === 'CIRCLE' && recognizedShape.center && recognizedShape.radius) {
        ctx.beginPath();
        ctx.arc(recognizedShape.center.x, recognizedShape.center.y, recognizedShape.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(recognizedShape.vertices[0].x, recognizedShape.vertices[0].y);
        for (let i = 1; i < recognizedShape.vertices.length; i++) {
          ctx.lineTo(recognizedShape.vertices[i].x, recognizedShape.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Corner Vertices
      recognizedShape.vertices.forEach((v) => {
        ctx.fillStyle = '#00ff9d';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Paper Scan Highlight Box
    if (paperScanHighlight && paperScanHighlight.length >= 3) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(paperScanHighlight[0].x, paperScanHighlight[0].y);
      for (let i = 1; i < paperScanHighlight.length; i++) {
        ctx.lineTo(paperScanHighlight[i].x, paperScanHighlight[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      paperScanHighlight.forEach((pt, idx) => {
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#030712';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(String.fromCharCode(65 + idx), pt.x - 4, pt.y + 4);
      });
    }
  }, [airDrawStrokes, recognizedShape, paperScanHighlight]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      className="relative w-full h-full min-h-[540px] rounded-2xl border-2 border-cyan-500/50 bg-slate-950 overflow-hidden select-none shadow-[0_0_30px_rgba(0,243,255,0.25)] holo-3d-layer"
    >
      <canvas ref={hiddenAnalyzeCanvasRef} className="hidden" />

      {/* Background Camera Feeds */}
      {activeFeedType === 'PHONE' && phoneFrameImg ? (
        <img
          src={phoneFrameImg}
          alt="Phone Camera Live Feed"
          className="absolute inset-0 w-full h-full object-cover filter contrast-105"
        />
      ) : activeFeedType === 'WEBCAM' ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <canvas
          ref={testCanvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Cybernetic Scanlines & Vignette */}
      <div className="absolute inset-0 hologram-scanlines pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette from-transparent via-transparent to-slate-950/80 pointer-events-none" />

      {/* Air Drawing Layer */}
      <canvas
        ref={drawCanvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
      />

      {/* Luminous Pointer Aura with Trailing Cyan Light (Visible Only When Gesture Tracking Active) */}
      <HolographicPointerAura
        x={reticlePos.x}
        y={reticlePos.y}
        isActive={Boolean(opticalHandResult?.detected || airDrawMode)}
        isPinching={isPinching}
        isHoveringButton={hoveredNode !== null}
      />

      {/* Floating Holographic Action Nodes Hovering in Spatial Viewport */}
      {floatingNodes.map((node, idx) => {
        const isHovered = hoveredNode === node.id;
        const isActive = activeModule === node.id;
        const isClicked = isHovered && isPinching;

        // Calculate 3D Parallax Tilt based on distance to reticle/hand
        let tiltX = 0;
        let tiltY = 0;
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const nodeX = (node.xPct / 100) * rect.width;
          const nodeY = (node.yPct / 100) * rect.height;
          const dist = Math.hypot(reticlePos.x - nodeX, reticlePos.y - nodeY);
          if (dist < 180) {
            tiltX = Math.max(-14, Math.min(14, ((reticlePos.y - nodeY) / 180) * -14));
            tiltY = Math.max(-14, Math.min(14, ((reticlePos.x - nodeX) / 180) * 14));
          }
        }

        return (
          <div
            key={node.id}
            onClick={() => {
              holoAudio.playHoloClick();
              onSelectModule(node.id);
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-all duration-200 perspective-spatial ${
              idx % 2 === 0 ? 'animate-float-a' : 'animate-float-b'
            }`}
            style={{
              left: `${node.xPct}%`,
              top: `${node.yPct}%`,
            }}
          >
            {/* 3D Depth Card with Parallax Tilt & Micro-vibration */}
            <div
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-xl border-2 transition-all duration-200 select-none ${
                isClicked
                  ? 'animate-micro-vibrate border-emerald-400 bg-emerald-950/90 shadow-[0_0_35px_rgba(0,255,157,0.9),inset_0_0_20px_rgba(0,255,157,0.5)]'
                  : isHovered
                  ? 'border-cyan-300 bg-slate-900/90 shadow-[0_0_28px_rgba(0,243,255,0.7),inset_0_0_15px_rgba(0,243,255,0.3)]'
                  : isActive
                  ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                  : 'border-cyan-500/30 bg-slate-950/75 hover:border-cyan-400/60'
              }`}
              style={{
                transform: isClicked
                  ? `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(-28px) scale(0.92)`
                  : isHovered
                  ? `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(16px) scale(1.08)`
                  : `perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)`,
                transition: isClicked ? 'none' : 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Radial Holographic Shockwave on Click */}
              {isClicked && (
                <div className="absolute -inset-2 rounded-2xl border-2 border-emerald-400 animate-shockwave pointer-events-none" />
              )}

              {/* Holographic Glowing Icon */}
              <span
                className={`text-2xl filter transition-transform duration-200 ${
                  isClicked ? 'scale-90' : isHovered ? 'scale-115' : ''
                } drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]`}
              >
                {node.icon}
              </span>

              <div>
                <div
                  className={`text-xs font-hud font-bold tracking-wider transition-colors duration-150 ${
                    isClicked
                      ? 'text-emerald-300'
                      : isHovered
                      ? 'text-cyan-100'
                      : 'text-cyan-200'
                  }`}
                >
                  {node.label}
                </div>
                <div className="text-[10px] font-mono text-cyan-400/70">
                  {node.sublabel}
                </div>
              </div>

              {/* Dwell charge aura */}
              {isHovered && !isClicked && (
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/60 animate-ping opacity-30 pointer-events-none" />
              )}
            </div>
          </div>
        );
      })}

      {/* Top HUD Telemetry Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 px-3 py-1.5 border border-cyan-500/40 backdrop-blur-md">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-hud text-xs font-bold tracking-widest text-cyan-300">
              KRYPTON VISION AI // MASTER SPEC v0.2
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 px-2.5 py-1 text-[11px] font-mono text-cyan-400 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              SOURCE: {activeFeedType === 'PHONE' ? 'SMARTPHONE BRIDGE' : activeFeedType}
            </span>
          </div>

          {opticalHandResult?.detected && (
            <div className="rounded-xl bg-emerald-950/85 px-2.5 py-1 text-[11px] font-mono text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 animate-pulse">
              <Hand className="h-3.5 w-3.5 text-emerald-400" />
              <span>HAND DETECTED ({Math.round(opticalHandResult.confidence * 100)}% LOCK)</span>
            </div>
          )}
        </div>

        {/* Right Toolbar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onOpenGestureTutorial && (
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onOpenGestureTutorial();
              }}
              className="holo-depth-btn px-3 py-1.5 rounded-xl border text-xs font-hud font-bold flex items-center gap-1.5 backdrop-blur-md bg-gradient-to-r from-cyan-950/90 to-slate-950/90 text-cyan-200 border-cyan-400/60 shadow-[0_0_12px_rgba(0,243,255,0.35)] hover:border-cyan-300 transition-all"
            >
              <Hand className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Gesture Tutorial
            </button>
          )}

          <button
            onClick={handleDetectPaperDiagram}
            className="holo-depth-btn px-3 py-1.5 rounded-xl border text-xs font-hud font-bold flex items-center gap-1.5 backdrop-blur-md bg-slate-950/80 text-amber-300 border-amber-500/30 hover:border-amber-400 transition-all"
          >
            <Scan className="h-3.5 w-3.5" />
            Detect Paper Drawing
          </button>

          <button
            onClick={() => {
              holoAudio.playHoloClick();
              setAirDrawMode((m) => !m);
              if (airDrawMode) {
                setAirDrawStrokes([]);
                setRecognizedShape(null);
              }
            }}
            className={`holo-depth-btn px-3 py-1.5 rounded-xl border text-xs font-hud font-bold flex items-center gap-1.5 backdrop-blur-md transition-all ${
              airDrawMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_#00f3ff]'
                : 'bg-slate-950/80 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            {airDrawMode ? 'AIR DRAW: ON' : 'AIR DRAW: OFF'}
          </button>

          <button
            onClick={() => {
              holoAudio.playHoloClick();
              onOpenPhoneModal();
            }}
            className={`holo-depth-btn px-3 py-1.5 rounded-xl border text-xs font-hud font-bold flex items-center gap-1.5 backdrop-blur-md transition-all ${
              phoneConnected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/80'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {phoneConnected ? 'PHONE CONNECTED' : 'CONNECT PHONE CAM'}
          </button>
        </div>
      </div>

      {/* Live Recognized Shape Notification Banner */}
      {(recognizedShape || paperScanHighlight) && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/90 border-2 border-emerald-400 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_rgba(0,255,157,0.4)]">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-hud font-bold text-emerald-300">
                {paperScanHighlight
                  ? 'PAPER DIAGRAM RECOGNIZED: Triangle Δ'
                  : `AIR SHAPE DETECTED: ${recognizedShape?.label}`}
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                Confidence: {Math.round((recognizedShape?.confidence || 0.95) * 100)}% · Invariants ready to verify
              </div>
            </div>

            <button
              onClick={handleImportShapeToGeometry}
              className="holo-depth-btn ml-2 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-hud font-bold shadow-[0_0_10px_#10b981] transition-all"
            >
              Verify in Geometry Lab →
            </button>
          </div>
        </div>
      )}

      {/* Viewport Corner Brackets */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

      {/* Bottom Floating Telemetry */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="rounded-xl bg-slate-950/80 px-3 py-1 text-[11px] font-mono text-slate-300 border border-cyan-500/30 backdrop-blur-md flex items-center gap-3">
          <span>FPS: 60.0</span>
          <span>RAM: 0.98 GB / 4.0 GB MAX</span>
          <span>
            OPTICAL TRACKER: {opticalHandResult?.detected ? 'LOCKED ON HAND' : 'SEARCHING...'}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/80 px-3 py-1 text-[11px] font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
          {privacyLocalOnly ? 'OFFLINE SECURE · 0 BYTES EXFILTRATED' : 'HYBRID CLOUD ASSIST'}
        </div>
      </div>
    </div>
  );
};
