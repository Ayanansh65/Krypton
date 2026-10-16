import React, { useState, useEffect } from 'react';
import { Smartphone, QrCode, Link, Wifi, CheckCircle2, AlertTriangle, Video, Globe, Copy, Check } from 'lucide-react';
import { holoAudio } from '../utils/audioFeedback.ts';

interface PhoneBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneConnected: boolean;
  phoneDeviceInfo: string | null;
  onSelectFeed: (type: 'PHONE' | 'WEBCAM' | 'TEST_FEED' | 'IP_URL', urlOrId?: string) => void;
  activeSourceType: string;
}

export const PhoneBridgeModal: React.FC<PhoneBridgeModalProps> = ({
  isOpen,
  onClose,
  phoneConnected,
  phoneDeviceInfo,
  onSelectFeed,
  activeSourceType,
}) => {
  const [copied, setCopied] = useState(false);
  const [ipUrlInput, setIpUrlInput] = useState('');
  const [phoneUrl, setPhoneUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setPhoneUrl(`${origin}/?mode=phone`);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneUrl);
    setCopied(true);
    holoAudio.playHoloClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipUrlInput.trim()) return;
    holoAudio.playHoloClick();
    onSelectFeed('IP_URL', ipUrlInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-6 shadow-2xl text-slate-200">
        {/* Holographic Header Bar */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-950/60 p-2.5 border border-cyan-500/40 text-cyan-300">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-hud font-bold tracking-wide text-cyan-300 flex items-center gap-2">
                PHONE AS CAMERA BRIDGE
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                  WIRELESS OPTICS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect your smartphone camera to stream directly into Krypton Vision AI
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Connection Status Banner */}
        <div className="my-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                phoneConnected ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-100">
                {phoneConnected
                  ? `Phone Connected: ${phoneDeviceInfo || 'Active Transmitter'}`
                  : 'Awaiting Phone Camera Stream...'}
              </p>
              <p className="text-xs text-slate-400">
                {phoneConnected
                  ? 'Real-time wireless optical data streaming into HUD canvas.'
                  : 'Open the link below on your mobile device to transmit video.'}
              </p>
            </div>
          </div>
          {phoneConnected && (
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onSelectFeed('PHONE');
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-hud transition-all"
            >
              USE LIVE PHONE FEED
            </button>
          )}
        </div>

        {/* Method 1: Mobile Link / QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-hud text-cyan-300 font-semibold mb-2">
                <Link className="h-4 w-4" />
                METHOD 1: OPEN LINK ON YOUR PHONE
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Open this URL in Chrome / Safari on your mobile device:
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-cyan-500/20 p-2 font-mono text-xs text-cyan-200 overflow-hidden">
                <span className="truncate flex-1">{phoneUrl}</span>
                <button
                  onClick={handleCopy}
                  className="rounded p-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30"
                  title="Copy Link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={phoneUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs font-bold transition-all"
              >
                TEST IN NEW TAB
              </a>
            </div>
          </div>

          {/* Method 2: IP Camera URL */}
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-xs font-hud text-cyan-300 font-semibold mb-2">
              <Globe className="h-4 w-4" />
              METHOD 2: DROIDCAM / IP WEBCAM STREAM
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Enter any local WiFi IP camera URL (e.g., from DroidCam, EpocCam, or IP Webcam app):
            </p>
            <form onSubmit={handleConnectIp} className="space-y-2">
              <input
                type="text"
                placeholder="http://192.168.1.5:4747/video"
                value={ipUrlInput}
                onChange={(e) => setIpUrlInput(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-cyan-500/30 px-3 py-2 text-xs font-mono text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-hud text-xs font-semibold"
              >
                CONNECT IP STREAM
              </button>
            </form>
          </div>
        </div>

        {/* Method 3: Built-in & High-Definition Test Feeds */}
        <div className="rounded-xl border border-cyan-500/20 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-hud text-cyan-300 font-semibold">
              <Video className="h-4 w-4" />
              OR CHOOSE A BUILT-IN OPTICAL FEED
            </div>
            <span className="text-[10px] text-slate-400">Instant Verification</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onSelectFeed('WEBCAM');
                onClose();
              }}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                activeSourceType === 'WEBCAM'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/30 text-slate-300'
              }`}
            >
              <div className="text-xs font-hud font-bold">Laptop / PC Webcam</div>
              <div className="text-[10px] text-slate-400">Direct media device</div>
            </button>

            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onSelectFeed('TEST_FEED', 'TRIANGLE_PAPER');
                onClose();
              }}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                activeSourceType === 'TEST_FEED_TRIANGLE_PAPER'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/30 text-slate-300'
              }`}
            >
              <div className="text-xs font-hud font-bold">Paper Geometry</div>
              <div className="text-[10px] text-slate-400">Drawn triangle on desk</div>
            </button>

            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onSelectFeed('TEST_FEED', 'PHYSICS_PENDULUM');
                onClose();
              }}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                activeSourceType === 'TEST_FEED_PHYSICS_PENDULUM'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/30 text-slate-300'
              }`}
            >
              <div className="text-xs font-hud font-bold">Physics Apparatus</div>
              <div className="text-[10px] text-slate-400">Projectile & pendulum</div>
            </button>

            <button
              onClick={() => {
                holoAudio.playHoloClick();
                onSelectFeed('TEST_FEED', 'CALCULUS_SHEET');
                onClose();
              }}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                activeSourceType === 'TEST_FEED_CALCULUS_SHEET'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                  : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/30 text-slate-300'
              }`}
            >
              <div className="text-xs font-hud font-bold">Calculus Equation</div>
              <div className="text-[10px] text-slate-400">Quadratic & polynomial</div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>Krypton Protocol v0.2 · Low 4GB RAM Footprint Mode Active</span>
          <button
            onClick={() => {
              holoAudio.playHoloClick();
              onClose();
            }}
            className="text-cyan-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
