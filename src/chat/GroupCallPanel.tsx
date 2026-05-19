import { useRef, useEffect, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Users,
  Maximize2,
  Minimize2,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useGroupCall, type Participant } from "./useGroupCall";
import type { GroupCallInfo } from "./ChatContext";

interface GroupCallPanelProps {
  roomId: string;
  roomType: "dm" | "group";
  activeCall: GroupCallInfo | undefined;
  currentUserId: string;
  canStartCall?: boolean;
  isAdmin: boolean;
  members: { user_id: string; user_name?: string }[];
}

export default function GroupCallPanel({
  roomId,
  roomType,
  activeCall,
  canStartCall = true,
  isAdmin,
  members,
}: GroupCallPanelProps) {
  const gc = useGroupCall(roomId);
  const [fullView, setFullView] = useState(false);

  if (roomType !== "group") return null;

  const isInCall = gc.state === "connected";
  const hasActiveCall = !!activeCall;

  // No call at all — show start button in header (only if permitted)
  if (!hasActiveCall && !isInCall) {
    if (!canStartCall) return null;
    const starting = gc.state === "joining" || gc.actionLoading === "starting";
    return (
      <button
        onClick={gc.start}
        disabled={starting}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-start/10 text-accent-start hover:bg-accent-start/20 transition-colors whitespace-nowrap disabled:opacity-50"
      >
        {starting ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
        {starting ? "Starting…" : "Start Call"}
      </button>
    );
  }

  // Call exists but user hasn't joined — show join banner
  if (hasActiveCall && !isInCall) {
    return (
      <JoinBanner
        activeCall={activeCall!}
        isAdmin={isAdmin}
        joining={gc.state === "joining"}
        error={gc.error}
        members={members}
        onJoin={gc.join}
        onEnd={gc.end}
      />
    );
  }

  // User is in the call — show Meet-style view
  return (
    <MeetView
      participants={gc.participants}
      isMuted={gc.isMuted}
      isScreenSharing={gc.isScreenSharing}
      isAdmin={isAdmin}
      fullView={fullView}
      members={members}
      activeCall={activeCall}
      screenShareTrack={gc.screenShareTrack}
      getRemoteScreenTrack={gc.getRemoteScreenTrack}
      actionLoading={gc.actionLoading}
      onToggleMute={gc.toggleMute}
      onToggleScreen={gc.toggleScreenShare}
      onLeave={gc.leave}
      onEnd={gc.end}
      onToggleFullView={() => setFullView((v) => !v)}
    />
  );
}

// ── Join Banner (shown when call is active but user hasn't joined) ──

function JoinBanner({
  activeCall,
  isAdmin,
  joining,
  error,
  members,
  onJoin,
  onEnd,
}: {
  activeCall: GroupCallInfo;
  isAdmin: boolean;
  joining: boolean;
  error: string | null;
  members: { user_id: string; user_name?: string }[];
  onJoin: () => void;
  onEnd: () => void;
}) {
  const getName = (uid: string) =>
    members.find((m) => m.user_id === uid)?.user_name || uid.slice(0, 8);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-start/5 border-b border-accent-start/10">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-start opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-start" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent-start">Call active</span>
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Users size={10} /> {activeCall.participants.size}
          </span>
        </div>
        {error && <span className="text-[10px] text-red-400">{error}</span>}
        <span className="text-[10px] text-zinc-500 truncate block">
          {Array.from(activeCall.participants).map(getName).join(", ")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onJoin}
          disabled={joining}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-start text-black hover:bg-accent-start/90 transition-colors disabled:opacity-50"
        >
          <Phone size={12} />
          {joining ? "Joining…" : "Join"}
        </button>

        {isAdmin && (
          <button
            onClick={onEnd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="End call for everyone"
          >
            <PhoneOff size={12} /> End
          </button>
        )}
      </div>
    </div>
  );
}

// ── Meet-style Call View ──

function MeetView({
  participants,
  isMuted,
  isScreenSharing,
  isAdmin,
  fullView,
  members,
  activeCall,
  screenShareTrack,
  getRemoteScreenTrack,
  actionLoading,
  onToggleMute,
  onToggleScreen,
  onLeave,
  onEnd,
  onToggleFullView,
}: {
  participants: Participant[];
  isMuted: boolean;
  isScreenSharing: boolean;
  isAdmin: boolean;
  fullView: boolean;
  members: { user_id: string; user_name?: string }[];
  activeCall: GroupCallInfo | undefined;
  screenShareTrack: MediaStreamTrack | null;
  getRemoteScreenTrack: () => MediaStreamTrack | null;
  actionLoading: string | null;
  onToggleMute: () => void;
  onToggleScreen: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onToggleFullView: () => void;
}) {
  const remoteScreen = getRemoteScreenTrack();
  const activeScreen = screenShareTrack || remoteScreen;
  const screenSharer = activeScreen
    ? participants.find((p) => p.isScreenSharing)
    : null;

  // Elapsed timer
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const startedAt = activeCall?.startedAt;
    if (!startedAt) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - startedAt) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCall?.startedAt]);

  const hasWarning = !!activeCall?.warningRemainingSec;

  return (
    <div
      className={`flex flex-col bg-[#0c0c12] transition-all ${
        fullView
          ? "fixed inset-0 z-50"
          : "border-b border-white/5 h-72"
      }`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-start opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-start" />
          </span>
          <span className="text-xs font-bold text-white">In call</span>
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Users size={10} /> {participants.length}
          </span>
          {elapsed && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <Clock size={10} /> {elapsed}
            </span>
          )}
        </div>
        <button
          onClick={onToggleFullView}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          title={fullView ? "Minimize" : "Maximize"}
        >
          {fullView ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Warning banner */}
      {hasWarning && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-600/20 border-b border-amber-500/30">
          <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300 font-medium">
            Call ending in ~{Math.ceil((activeCall?.warningRemainingSec ?? 0) / 60)} min
          </span>
        </div>
      )}

      {/* Main stage */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {activeScreen ? (
          /* Screen share layout: main stage + side strip */
          <div className="flex flex-1 gap-2 p-2">
            <div className="flex-1 relative rounded-xl overflow-hidden border border-white/5 bg-black">
              <ScreenShareVideo track={activeScreen} />
              {screenSharer && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-accent-start font-bold">
                  <Monitor size={10} />{" "}
                  {screenSharer.isLocal
                    ? "You"
                    : resolveName(screenSharer, members)}
                </div>
              )}
            </div>
            <div className="w-24 flex flex-col gap-2 overflow-y-auto">
              {participants.map((p) => (
                <ParticipantTile
                  key={p.sid}
                  participant={p}
                  members={members}
                  compact
                />
              ))}
            </div>
          </div>
        ) : (
          /* No screen share: participant grid */
          <div className="flex-1 p-2">
            <div className={`h-full grid gap-2 ${gridCols(participants.length)}`}>
              {participants.map((p) => (
                <ParticipantTile
                  key={p.sid}
                  participant={p}
                  members={members}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-white/10 bg-[#0a0a0f]">
        <button
          onClick={onToggleMute}
          className={`p-2.5 rounded-full transition-colors ${
            isMuted
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          onClick={onToggleScreen}
          className={`p-2.5 rounded-full transition-colors ${
            isScreenSharing
              ? "bg-accent-start/20 text-accent-start hover:bg-accent-start/30"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
        </button>

        <button
          onClick={onLeave}
          disabled={actionLoading === "leaving"}
          className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          title="Leave call"
        >
          {actionLoading === "leaving" ? <Loader2 size={18} className="animate-spin" /> : <PhoneOff size={18} />}
        </button>

        {isAdmin && (
          <button
            onClick={onEnd}
            disabled={actionLoading === "ending"}
            className="px-3 py-1.5 rounded-full bg-red-600/80 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            title="End call for everyone"
          >
            {actionLoading === "ending" ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
            {actionLoading === "ending" ? "Ending…" : "End All"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Participant Tile ──

function ParticipantTile({
  participant: p,
  members,
  compact,
}: {
  participant: Participant;
  members: { user_id: string; user_name?: string }[];
  compact?: boolean;
}) {
  const name = resolveName(p, members);
  const displayName = p.isLocal ? "You" : name;

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border transition-all ${
        p.isSpeaking
          ? "border-accent-start/50 bg-accent-start/5 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
          : "border-white/5 bg-white/[0.02]"
      } ${compact ? "p-2" : "p-3"}`}
    >
      <div
        className={`rounded-full flex items-center justify-center font-bold ${
          p.isMuted
            ? "bg-zinc-700/50 text-zinc-400"
            : "bg-accent-start/15 text-accent-start"
        } ${compact ? "w-10 h-10 text-sm" : "w-14 h-14 text-lg"}`}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>

      <span
        className={`text-zinc-300 truncate max-w-full text-center mt-1.5 font-medium ${
          compact ? "text-[9px]" : "text-xs"
        }`}
      >
        {displayName}
      </span>

      {p.isMuted && (
        <div className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500/20">
          <MicOff size={10} className="text-red-400" />
        </div>
      )}

      {p.isScreenSharing && (
        <div className="absolute top-1 left-1 p-0.5 rounded-full bg-accent-start/20">
          <Monitor size={10} className="text-accent-start" />
        </div>
      )}
    </div>
  );
}

// ── Screen Share Video ──

function ScreenShareVideo({ track }: { track: MediaStreamTrack }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && track) {
      videoRef.current.srcObject = new MediaStream([track]);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-contain"
    />
  );
}

// ── Helpers ──

function resolveName(
  p: Participant,
  members: { user_id: string; user_name?: string }[]
): string {
  if (p.name) return p.name;
  const m = members.find((x) => x.user_id === p.identity);
  return m?.user_name || p.identity.slice(0, 8);
}

function gridCols(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
}
