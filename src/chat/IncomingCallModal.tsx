import { Phone, PhoneOff, Video } from "lucide-react";
import Avatar from "./Avatar";

interface Props {
  callerName: string;
  callerAvatarKey?: string;
  hasVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  callerAvatarKey,
  hasVideo,
  onAccept,
  onReject,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[300px] animate-pulse-slow">
        {/* Caller avatar */}
        <div className="ring-4 ring-accent-start/30 animate-pulse rounded-full">
          <Avatar name={callerName} avatarKey={callerAvatarKey} size="lg" className="w-20 h-20 text-3xl" />
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">{callerName}</h3>
          <p className="text-sm text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
            {hasVideo ? <Video size={14} /> : <Phone size={14} />}
            Incoming {hasVideo ? "video" : "audio"} call…
          </p>
        </div>

        {/* Accept / Reject */}
        <div className="flex items-center gap-8">
          <button
            onClick={onReject}
            className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition-colors"
            title="Decline"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={onAccept}
            className="w-14 h-14 rounded-full bg-accent-start/20 text-accent-start hover:bg-accent-start/30 flex items-center justify-center transition-colors animate-bounce"
            title="Accept"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
