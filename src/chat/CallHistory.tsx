import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Users, Video, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useCallHistory } from "./useChatApi";
import { getUserId } from "../hooks/useRole";
import type { CallLog } from "./types";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CallIcon({ call, isOutgoing }: { call: CallLog; isOutgoing: boolean }) {
  const isMissed = call.status === "missed" || call.status === "rejected" || call.status === "cancelled";
  if (isMissed) return <PhoneMissed size={16} className="text-red-400" />;
  if (isOutgoing) return <PhoneOutgoing size={16} className="text-green-400" />;
  return <PhoneIncoming size={16} className="text-blue-400" />;
}

interface Props {
  onCallPeer?: (peerId: string, video: boolean) => void;
}

export default function CallHistory({ onCallPeer }: Props) {
  const currentUserId = getUserId() || "";
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useCallHistory();

  const calls = useMemo(
    () => data?.pages.flatMap((p) => p.calls) ?? [],
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
        <Phone size={28} className="mb-2 opacity-40" />
        <p className="text-sm">No calls yet</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5"
      onScroll={(e) => {
        if (!hasNextPage || isFetchingNextPage) return;
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
          fetchNextPage();
        }
      }}
    >
      {calls.map((call) => {
        const isGroup = call.call_type === "group_audio" || call.call_type === "group_video";
        const isOutgoing = call.initiated_by === currentUserId;
        const isMissed = call.status === "missed" || call.status === "rejected" || call.status === "cancelled";
        const isVideo = call.call_type === "video" || call.call_type === "group_video";
        const peerName = call.peer_name || "Unknown";

        return (
          <div
            key={call.id}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-all"
          >
            {/* Call direction icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isGroup ? "bg-purple-500/10" : isMissed ? "bg-red-500/10" : isOutgoing ? "bg-green-500/10" : "bg-blue-500/10"
            }`}>
              {isGroup ? (
                <Users size={16} className="text-purple-400" />
              ) : (
                <CallIcon call={call} isOutgoing={isOutgoing} />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold truncate ${
                  isMissed ? "text-red-400" : "text-white"
                }`}>
                  {peerName}
                </span>
                <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                  {timeAgo(call.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isVideo ? <Video size={10} className="text-zinc-500" /> : <Phone size={10} className="text-zinc-500" />}
                <span className={`text-xs ${isMissed ? "text-red-400/70" : "text-zinc-500"}`}>
                  {isMissed
                    ? isOutgoing ? "Cancelled" : "Missed"
                    : call.duration_seconds
                      ? formatDuration(call.duration_seconds)
                      : isOutgoing ? "Outgoing" : "Incoming"
                  }
                </span>
              </div>
            </div>

            {/* Call back button */}
            {onCallPeer && call.peer_id && (
              <button
                onClick={() => onCallPeer(call.peer_id!, isVideo)}
                className="p-2 rounded-lg text-zinc-400 hover:text-accent-start hover:bg-accent-start/10 transition-colors shrink-0"
                title={isVideo ? "Video call" : "Audio call"}
              >
                {isVideo ? <Video size={14} /> : <Phone size={14} />}
              </button>
            )}
          </div>
        );
      })}
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-accent-start rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
