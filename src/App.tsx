import React, { useState, useEffect } from 'react';
import {
  Camera,
  Compass,
  Box,
  Activity,
  Calculator,
  BookOpen,
  Smartphone,
  Volume2,
  VolumeX,
  Shield,
  Layers,
  Sparkles,
  Maximize2,
  Eye,
  Info,
  Hand,
} from 'lucide-react';
import { CameraStreamViewer, ActiveModule } from './components/CameraStreamViewer.tsx';
import { PrecisionGeometryLab } from './components/PrecisionGeometryLab.tsx';
import { ThreeGeometryLab } from './components/ThreeGeometryLab.tsx';
import { WhatIfSimulationLab } from './components/WhatIfSimulationLab.tsx';
import { VisualMathSolverLab } from './components/VisualMathSolverLab.tsx';
import { DigitalScienceNotebook, NotebookEntry } from './components/DigitalScienceNotebook.tsx';
import { PhoneBridgeModal } from './components/PhoneBridgeModal.tsx';
import { MobileCameraTransmitter } from './components/MobileCameraTransmitter.tsx';
import { HolographicGestureTutorial } from './components/HolographicGestureTutorial.tsx';
import { holoAudio } from './utils/audioFeedback.ts';
import { Point2D } from './utils/geometry.ts';

// Initial verified scientific log entries
const INITIAL_ENTRIES: NotebookEntry[] = [
  {
    id: 'entry-1',
    timestamp: '2026-10-16 14:15:02',
    title: 'Euclidean Triangle Dual Invariant Verification',
    type: 'GEOMETRY_SELF_CHECK',
    details: 'Verified 3-4-5 right triangle: Shoelace area (6.00) matches Heron formula (6.00) with 0.0000 residual error. Angle sum = 180.00° precisely.',
    metrics: { sides: [3, 4, 5], angles: [36.87, 53.13, 90.0], area: 6.0, perimeter: 12.0 },
  },
  {
    id: 'entry-2',
    timestamp: '2026-10-16 14:22:45',
    title: 'Regular Octahedron Euler Characteristic χ = 2',
    type: '3D_TOPOLOGY',
    details: 'V=6, E=12, F=8. Euler-Poincaré invariant V - E + F = 2 strictly satisfied for genus-0 spherical polyhedral manifold.',
    metrics: { vertices: 6, edges: 12, faces: 8, euler: 2 },
  },
  {
    id: 'entry-3',
    timestamp: '2026-10-16 14:30:11',
    title: 'Aerodynamic Drag Ballistic Projectile Trajectory',
    type: 'PHYSICS_SIMULATION',
    details: 'v₀=25 m/s, θ=45°, Cd=0.02. Range reached 53.4 m with apogee height 15.2 m. Energy dissipation verified.',
    metrics: { v0: 25, angle: 45, range: 53.4, maxHeight: 15.2 },
  },
];

export default function App() {
  // Mobile Camera Transmitter route check (?mode=phone or pathname /phone)
  const [isPhoneClientMode, setIsPhoneClientMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'phone' || window.location.pathname === '/phone') {
        setIsPhoneClientMode(true);
      }
    }
  }, []);

  const [activeModule, setActiveModule] = useState<ActiveModule>('CAMERA_HUD');
  const [isMuted, setIsMuted] = useState(false);
  const [privacyLocalOnly, setPrivacyLocalOnly] = useState(true);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [gestureTutorialOpen, setGestureTutorialOpen] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneDeviceInfo, setPhoneDeviceInfo] = useState<string | null>(null);
  const [activeFeedType, setActiveFeedType] = useState<'PHONE' | 'WEBCAM' | 'TEST_FEED' | 'IP_URL'>('TEST_FEED');
  const [testFeedSubtype, setTestFeedSubtype] = useState('TRIANGLE_PAPER');
  const [airDrawPoints, setAirDrawPoints] = useState<Point2D[]>([]);
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>(INITIAL_ENTRIES);

  // Poll phone status every 3 seconds
  useEffect(() => {
    const checkPhone = async () => {
      try {
        const res = await fetch('/api/phone/status');
        if (res.ok) {
          const data = await res.json();
          setPhoneConnected(data.connected);
          if (data.connected && data.deviceInfo) {
            setPhoneDeviceInfo(data.deviceInfo);
          }
        }
      } catch {}
    };

    checkPhone();
    const interval = setInterval(checkPhone, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    holoAudio.setMuted(next);
    if (!next) holoAudio.playHoloClick();
  };

  const handleSelectFeed = (type: 'PHONE' | 'WEBCAM' | 'TEST_FEED' | 'IP_URL', urlOrId?: string) => {
    setActiveFeedType(type);
    if (type === 'TEST_FEED' && urlOrId) {
      setTestFeedSubtype(urlOrId);
    }
  };

  const handleSaveToNotebook = (entry: {
    title: string;
    type: string;
    details: string;
    metrics: any;
  }) => {
    const newEntry: NotebookEntry = {
      id: `entry-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      ...entry,
    };
    setNotebookEntries([newEntry, ...notebookEntries]);
  };

  // If in phone transmitter mode, render the dedicated mobile camera client
  if (isPhoneClientMode) {
    return <MobileCameraTransmitter />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sci-Fi Top Telemetry Bar */}
      <header className="border-b border-cyan-500/30 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 z-40 sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Version */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.4)]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-hud font-bold tracking-wider text-cyan-300">
                  KRYPTON VISION AI
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                  SPEC v0.2
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                SCIENTIFIC WORKSPACE · HOLOGRAPHIC GESTURE HUD
              </div>
            </div>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'CAMERA_HUD', label: 'Holo Vision HUD', icon: Camera },
              { id: 'GEOMETRY', label: 'Precision Geometry', icon: Compass },
              { id: 'THREE_LAB', label: '3D Geometry Lab', icon: Box },
              { id: 'SIMULATION', label: 'What-If Sims', icon: Activity },
              { id: 'MATH_SOLVER', label: 'Math Solver', icon: Calculator },
              { id: 'NOTEBOOK', label: `Notebook (${notebookEntries.length})`, icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    holoAudio.playHoloClick();
                    setActiveModule(tab.id as ActiveModule);
                  }}
                  className={`holo-btn px-3 py-1.5 rounded-lg text-xs font-hud font-bold flex items-center gap-1.5 transition-all whitespace-nowrap border ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.6)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* System Telemetry & Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* Holographic Air Gesture Tutorial Button */}
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                setGestureTutorialOpen(true);
              }}
              className="holo-btn px-2.5 py-1 rounded-lg text-xs font-hud font-semibold flex items-center gap-1.5 border border-cyan-400/50 bg-gradient-to-r from-cyan-950/80 to-slate-900 text-cyan-200 shadow-[0_0_12px_rgba(0,243,255,0.3)] hover:border-cyan-300 transition-all"
            >
              <Hand className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>Gesture Guide</span>
            </button>

            {/* Phone Camera Bridge Button */}
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                setPhoneModalOpen(true);
              }}
              className={`holo-btn px-2.5 py-1 rounded-lg text-xs font-hud font-semibold flex items-center gap-1.5 border transition-all ${
                phoneConnected
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              {phoneConnected ? 'Phone Cam Online' : 'Connect Phone Cam'}
            </button>

            {/* Privacy mode toggle */}
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                setPrivacyLocalOnly(!privacyLocalOnly);
              }}
              className={`holo-btn p-1.5 rounded-lg border text-xs transition-all ${
                privacyLocalOnly
                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title={privacyLocalOnly ? '100% Local Offline Privacy' : 'Hybrid Cloud AI Assist'}
            >
              <Shield className="h-4 w-4" />
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className={`holo-btn p-1.5 rounded-lg border text-xs transition-all ${
                !isMuted
                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
              title={isMuted ? 'Unmute Audio Feedback' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scientific Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col">
        {activeModule === 'CAMERA_HUD' && (
          <div className="flex-1 flex flex-col">
            <CameraStreamViewer
              activeModule={activeModule}
              onSelectModule={(mod) => setActiveModule(mod)}
              phoneConnected={phoneConnected}
              phoneDeviceInfo={phoneDeviceInfo}
              onOpenPhoneModal={() => setPhoneModalOpen(true)}
              onOpenGestureTutorial={() => setGestureTutorialOpen(true)}
              activeFeedType={activeFeedType}
              testFeedSubtype={testFeedSubtype}
              privacyLocalOnly={privacyLocalOnly}
              onAirDrawComplete={(pts) => {
                setAirDrawPoints(pts);
                setActiveModule('GEOMETRY');
              }}
            />
          </div>
        )}

        {activeModule === 'GEOMETRY' && (
          <PrecisionGeometryLab
            onSaveToNotebook={handleSaveToNotebook}
            airDrawPoints={airDrawPoints}
          />
        )}

        {activeModule === 'THREE_LAB' && <ThreeGeometryLab />}

        {activeModule === 'SIMULATION' && (
          <WhatIfSimulationLab onSaveToNotebook={handleSaveToNotebook} />
        )}

        {activeModule === 'MATH_SOLVER' && (
          <VisualMathSolverLab
            onSaveToNotebook={handleSaveToNotebook}
            onScanCameraFrame={() => {
              handleSelectFeed('TEST_FEED', 'CALCULUS_SHEET');
            }}
          />
        )}

        {activeModule === 'NOTEBOOK' && (
          <DigitalScienceNotebook
            entries={notebookEntries}
            onDeleteEntry={(id) => setNotebookEntries(notebookEntries.filter((e) => e.id !== id))}
            onClearAll={() => setNotebookEntries([])}
          />
        )}
      </main>

      {/* Phone Camera Bridge Connection Modal */}
      <PhoneBridgeModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        phoneConnected={phoneConnected}
        phoneDeviceInfo={phoneDeviceInfo}
        onSelectFeed={handleSelectFeed}
        activeSourceType={
          activeFeedType === 'TEST_FEED' ? `TEST_FEED_${testFeedSubtype}` : activeFeedType
        }
      />

      {/* Interactive Holographic Air-Gestures Tutorial Overlay */}
      <HolographicGestureTutorial
        isOpen={gestureTutorialOpen}
        onClose={() => setGestureTutorialOpen(false)}
        onLaunchPracticeInHUD={() => {
          setGestureTutorialOpen(false);
          setActiveModule('CAMERA_HUD');
        }}
      />
    </div>
  );
}
