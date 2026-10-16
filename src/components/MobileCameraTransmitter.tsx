import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Zap, Video, CheckCircle2, AlertCircle, Laptop } from 'lucide-react';

export const MobileCameraTransmitter: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(15);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [lastLatency, setLastLatency] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing camera...');
  const [error, setError] = useState<string | null>(null);

  const streamTrackRef = useRef<MediaStreamTrack | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize phone camera
  const startCamera = async () => {
    setError(null);
    setStatusMessage('Accessing smartphone optical sensor...');
    try {
      if (streamTrackRef.current) {
        streamTrackRef.current.stop();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      streamTrackRef.current = track;

      // Check for torch capability
      const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
      setTorchSupported(!!(capabilities as any).torch);

      setIsStreaming(true);
      setStatusMessage('Optics active. Transmitting frames to Krypton HUD...');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to access camera. Check device permissions.');
      setStatusMessage('Sensor connection failed.');
    }
  };

  const toggleTorch = async () => {
    if (!streamTrackRef.current || !torchSupported) return;
    try {
      const nextState = !torchOn;
      await (streamTrackRef.current as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.error('Torch toggle failed', err);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamTrackRef.current) {
        streamTrackRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [facingMode]);

  // Frame transmitter loop
  useEffect(() => {
    if (!isStreaming) return;

    const intervalTime = Math.round(1000 / fps);
    intervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Scale down slightly for ultra-fast network relay
      const targetWidth = 640;
      const targetHeight = Math.round((video.videoHeight / (video.videoWidth || 1)) * targetWidth) || 360;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const frameData = canvas.toDataURL('image/jpeg', 0.65);

      const startTime = performance.now();
      fetch('/api/phone/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: frameData,
          deviceInfo: `Phone (${facingMode === 'environment' ? 'Rear' : 'Front'} Cam)`,
        }),
      })
        .then((res) => {
          if (res.ok) {
            setFramesSent((c) => c + 1);
            setLastLatency(Math.round(performance.now() - startTime));
          }
        })
        .catch(() => {});
    }, intervalTime);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, fps, facingMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 font-sans flex flex-col items-center justify-between p-4 selection:bg-cyan-500">
      {/* Header telemetry */}
      <div className="w-full max-w-md flex items-center justify-between border-b border-cyan-500/30 pb-3">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-sm font-hud font-bold tracking-wider text-cyan-300">
            KRYPTON // PHONE OPTICAL SENSOR
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> ONLINE
          </span>
        </div>
      </div>

      {/* Main Viewfinder */}
      <div className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl my-4">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Holographic Crosshair Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
          <div className="flex justify-between text-[11px] font-mono text-cyan-300/80">
            <span>RES: 640x360</span>
            <span>FPS: {fps}</span>
          </div>
          <div className="self-center border border-cyan-400/40 w-32 h-32 rounded-lg relative flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-cyan-300/80">
            <span>FRAMES: {framesSent}</span>
            <span>PING: {lastLatency}ms</span>
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
            <p className="text-sm text-rose-300 font-mono mb-4">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-lg text-sm"
              >
                Retry Camera Access
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setIsStreaming(true);
                  setStatusMessage('Simulated sensor feed active. Transmitting to HUD...');
                  // Start simulated canvas drawer
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  canvas.width = 640;
                  canvas.height = 360;

                  let frameCount = 0;
                  const simInterval = setInterval(() => {
                    frameCount++;
                    ctx.fillStyle = '#050c18';
                    ctx.fillRect(0, 0, 640, 360);

                    // Grid
                    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
                    ctx.lineWidth = 1;
                    for (let x = 0; x < 640; x += 40) {
                      ctx.beginPath();
                      ctx.moveTo(x, 0);
                      ctx.lineTo(x, 360);
                      ctx.stroke();
                    }
                    for (let y = 0; y < 360; y += 40) {
                      ctx.beginPath();
                      ctx.moveTo(0, y);
                      ctx.lineTo(640, y);
                      ctx.stroke();
                    }

                    // Rotating reticle target
                    ctx.save();
                    ctx.translate(320, 180);
                    ctx.rotate(frameCount * 0.05);
                    ctx.strokeStyle = '#00f3ff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(-60, -60, 120, 120);
                    ctx.restore();

                    ctx.fillStyle = '#00ff9d';
                    ctx.font = 'bold 16px monospace';
                    ctx.fillText('LIVE SMARTPHONE OPTICAL STREAM', 180, 185);

                    const frameData = canvas.toDataURL('image/jpeg', 0.65);
                    fetch('/api/phone/frame', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        frame: frameData,
                        deviceInfo: 'Simulated Smartphone (Pixel 9 Pro)',
                      }),
                    })
                      .then((res) => {
                        if (res.ok) setFramesSent((c) => c + 1);
                      })
                      .catch(() => {});
                  }, 100);

                  return () => clearInterval(simInterval);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg text-sm border border-cyan-500/30"
              >
                Transmit Simulated Mobile Stream
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="w-full max-w-md bg-slate-900/80 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md">
        <div className="text-xs font-mono text-slate-300 mb-3 flex items-center justify-between">
          <span>{statusMessage}</span>
          <span className="text-cyan-400">Desktop Connected</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={switchCamera}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/20 text-xs font-hud transition-all active:scale-95"
          >
            <RefreshCw className="h-5 w-5 mb-1 text-cyan-300" />
            Flip Cam
          </button>

          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-hud transition-all active:scale-95 ${
                torchOn
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-cyan-500/20 text-cyan-300'
              }`}
            >
              <Zap className="h-5 w-5 mb-1" />
              Flash
            </button>
          )}

          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 border border-cyan-500/20">
            <span className="text-[10px] text-slate-400 mb-1">FPS Target</span>
            <div className="flex gap-1 text-xs font-mono">
              {[10, 15, 24].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFps(rate)}
                  className={`px-1.5 py-0.5 rounded ${
                    fps === rate ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-cyan-300'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Laptop className="h-3.5 w-3.5 text-cyan-400" />
            Streaming to Desktop HUD
          </span>
          <a
            href="/"
            className="text-cyan-400 underline hover:text-cyan-200"
          >
            Open Desktop HUD
          </a>
        </div>
      </div>
    </div>
  );
};
