import { createPortal } from "react-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Phone,
  Loader2,
} from "lucide-react";
import type { UseCallReturn } from "./useCall";
import Avatar from "./Avatar";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  call: UseCallReturn;
  peerName: string;
  peerAvatarKey?: string;
}

export default function CallView({ call, peerName, peerAvatarKey }: Props) {
  const isRinging = call.state === "ringing_out";
  const isConnecting = call.state === "connecting";
  const isConnected = call.state === "connected";
  const showVideo = isConnected && (call.hasVideo || call.remoteHasVideo);

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[#0a0a0f] flex flex-col">
      {/* Remote video or avatar */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Remote video/audio — always mounted for audio playback, visually hidden for audio-only */}
        <video
          ref={call.remoteRef}
          autoPlay
          playsInline
          className={
            showVideo
              ? "w-full h-full object-contain"
              : "absolute w-px h-px opacity-0 pointer-events-none"
          }
        />

        {/* Avatar fallback (audio call or not connected yet) */}
        {(!isConnected || !showVideo) && (
          <div className="flex flex-col items-center gap-4">
            <Avatar name={peerName} avatarKey={peerAvatarKey} size="lg" className="w-28 h-28 text-5xl" />
            <h2 className="text-2xl font-bold text-white">{peerName}</h2>
            {isRinging && (
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                <Phone size={14} className="animate-pulse" /> Ringing…
              </p>
            )}
            {isConnecting && (
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Connecting…
              </p>
            )}
            {isConnected && (
              <p className="text-sm text-accent-start font-mono">
                {formatDuration(call.duration)}
              </p>
            )}
          </div>
        )}

        {/* Local video PiP (camera or screen share preview) */}
        {(call.isCameraOn || call.isScreenSharing) && (
          <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <video
              ref={call.localRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {call.isScreenSharing && (
              <div className="absolute top-1 left-1 bg-cyan-500/80 text-[10px] text-white px-1.5 py-0.5 rounded">
                Screen
              </div>
            )}
          </div>
        )}

        {/* Duration overlay (for video calls) */}
        {isConnected && showVideo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <span className="text-sm font-mono text-white">
              {formatDuration(call.duration)}
            </span>
          </div>
        )}

        {/* Peer name overlay (for video calls) */}
        {isConnected && showVideo && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
            <span className="text-sm font-semibold text-white">{peerName}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-6 bg-[#0a0a0f]/90 border-t border-white/5">
        {/* Mute */}
        <button
          onClick={call.toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            call.isMuted
              ? "bg-red-500/20 text-red-400"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={call.isMuted ? "Unmute" : "Mute"}
        >
          {call.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Camera */}
        <button
          onClick={call.toggleCamera}
          disabled={!isConnected}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
            call.isCameraOn
              ? "bg-accent-start/20 text-accent-start"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={call.isCameraOn ? "Camera off" : "Camera on"}
        >
          {call.isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Screen share */}
        <button
          onClick={call.toggleScreen}
          disabled={!isConnected}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
            call.isScreenSharing
              ? "bg-cyan-500/20 text-cyan-400"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={call.isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {call.isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>

        {/* Hang up */}
        <button
          onClick={call.hangup}
          className="w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
          title="Hang up"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>,
    document.body
  );
}
