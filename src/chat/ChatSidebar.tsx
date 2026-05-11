import { Search, Plus, Users, MessageCircle, Phone, Loader2, X } from "lucide-react";
import { useState, useMemo } from "react";
import type { RoomListItem } from "./types";
import { useChatContext } from "./ChatContext";
import { useSearchMessages } from "./useChatApi";
import Avatar from "./Avatar";
import CallHistory from "./CallHistory";

interface Props {
  rooms: RoomListItem[];
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onNewChat: () => void;
  onNewGroup?: () => void;
  currentUserId: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onCallPeer?: (peerId: string, video: boolean) => void;
}

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

/** Highlight matched substring in bold */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-white">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ChatSidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  onNewChat,
  onNewGroup,
  currentUserId,
  hasMore,
  loadingMore,
  onLoadMore,
  onCallPeer,
}: Props) {
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [tab, setTab] = useState<"chats" | "calls">("chats");
  const { typingUsers, realtimeMessages, roomOpenedAt, activeGroupCalls, onlineUsers } = useChatContext();
  const isSearching = search.length >= 2;
  const { data: searchData, isLoading: searchLoading } = useSearchMessages(committedSearch);
  const searchResults = searchData?.results ?? [];

  const filtered = useMemo(() => rooms.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name =
      r.type === "dm"
        ? (r.other_name ?? "").toLowerCase()
        : (r.name ?? "").toLowerCase();
    return name.includes(q);
  }), [rooms, search]);

  return (
    <div className="flex flex-col h-full border-r border-white/5 bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("chats")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === "chats"
                ? "text-white bg-white/[0.06]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setTab("calls")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              tab === "calls"
                ? "text-white bg-white/[0.06]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Phone size={14} />
            Calls
          </button>
        </div>
        <div className="flex items-center gap-1">
          {onNewGroup && (
            <button
              onClick={onNewGroup}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title="New group"
            >
              <Users size={18} />
            </button>
          )}
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="New DM"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {tab === "calls" ? (
        <CallHistory onCallPeer={onCallPeer} />
      ) : (
      <>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.length >= 2) setCommittedSearch(search);
            }}
            placeholder="Search messages…"
            className="w-full bg-zinc-900 border border-white/5 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent-start/40 transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setCommittedSearch(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Room list / Search results */}
      <div
        className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5"
        onScroll={(e) => {
          if (!hasMore || loadingMore || search) return;
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
            onLoadMore?.();
          }
        }}
      >
        {isSearching ? (
          // ── Search mode: matching chats + matching messages ──
          <>
            {/* Matching chats (name match) */}
            {filtered.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Chats</span>
                </div>
                {filtered.map((room) => {
                  const displayName =
                    room.type === "dm"
                      ? room.other_name || "Unknown"
                      : room.name || "Group";
                  return (
                    <button
                      key={room.id}
                      onClick={() => { onSelectRoom(room.id); setSearch(""); setCommittedSearch(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border border-transparent hover:bg-white/[0.03] transition-all"
                    >
                      {room.type === "dm" ? (
                        <Avatar name={displayName} avatarKey={room.other_avatar_url} size="md" />
                      ) : room.avatar_url ? (
                        <Avatar name={displayName} avatarKey={room.avatar_url} size="md" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-purple-500/15 text-purple-400">
                          <Users size={14} />
                        </div>
                      )}
                      <span className="text-sm text-zinc-300 truncate">
                        <HighlightText text={displayName} query={search} />
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Matching messages (content match) — only after Enter */}
            {committedSearch.length >= 2 && (
              <>
                <div className="px-2 pt-3 pb-1">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Messages</span>
                </div>
                {searchLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-zinc-500" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-6">No messages found</p>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { onSelectRoom(r.room_id); setSearch(""); setCommittedSearch(""); }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left border border-transparent hover:bg-white/[0.03] transition-all"
                    >
                      <Avatar name={r.room_name || "?"} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white truncate">{r.room_name}</span>
                          <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          <HighlightText text={r.content ?? ""} query={committedSearch} />
                        </p>
                        <span className="text-[10px] text-zinc-600">{r.sender_name}</span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {/* Hint to press Enter */}
            {!committedSearch && isSearching && filtered.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-6">Press Enter to search messages</p>
            )}

            {committedSearch && filtered.length === 0 && searchResults.length === 0 && !searchLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <Search size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No results found</p>
              </div>
            )}
          </>
        ) : (
          // ── Room list ──
          <>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <MessageCircle size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No conversations yet</p>
          </div>
        )}
        {filtered.map((room) => {
          const isActive = room.id === activeRoomId;
          const displayName =
            room.type === "dm"
              ? room.other_name || "Unknown"
              : room.name || "Group";
          // Use the latest realtime message if newer than the API's last_message
          const rtMsgs = realtimeMessages.get(room.id);
          const rtLast = rtMsgs?.length ? rtMsgs[rtMsgs.length - 1] : undefined;
          const apiLast = room.last_message;
          const lastMsg =
            rtLast && (!apiLast || new Date(rtLast.created_at) >= new Date(apiLast.created_at))
              ? rtLast
              : apiLast;
          const isTyping = typingUsers.get(room.id)?.size;
          const senderIsMe = lastMsg?.sender_id === currentUserId;

          // Optimistic unread count
          const openedAt = roomOpenedAt.get(room.id) ?? 0;
          let unread: number;
          if (isActive) {
            // Currently viewing this room — no unread
            unread = 0;
          } else if (openedAt > 0) {
            // User has opened this room before — only count messages arriving after they left
            unread = rtMsgs?.filter(
              (m) => m.sender_id !== currentUserId && new Date(m.created_at).getTime() > openedAt
            ).length ?? 0;
          } else {
            // Never opened in this session — use API count, overlay with realtime
            const rtNew = rtMsgs?.filter((m) => m.sender_id !== currentUserId).length ?? 0;
            unread = Math.max(room.unread_count, rtNew);
          }

          const hasActiveCall = activeGroupCalls.has(room.id);

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 ${
                isActive
                  ? "bg-white/[0.06] border border-white/10"
                  : hasActiveCall
                    ? "border border-accent-start/20 bg-accent-start/[0.04] hover:bg-accent-start/[0.08]"
                    : "border border-transparent hover:bg-white/[0.03]"
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {room.type === "dm" ? (
                  <Avatar name={displayName} avatarKey={room.other_avatar_url} size="md" />
                ) : room.avatar_url ? (
                  <Avatar name={displayName} avatarKey={room.avatar_url} size="md" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-purple-500/15 text-purple-400">
                    <Users size={16} />
                  </div>
                )}
                {room.type === "dm" && room.other_user_id && onlineUsers.has(room.other_user_id) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-[#0a0a0f]" />
                )}
                {activeGroupCalls.has(room.id) && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-start flex items-center justify-center ring-2 ring-[#0a0a0f] animate-pulse">
                    <Phone size={8} className="text-black" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate">
                    {displayName}
                  </span>
                  {lastMsg && (
                    <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                      {timeAgo(lastMsg.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-zinc-500 truncate">
                    {isTyping ? (
                      <span className="text-accent-start italic">typing…</span>
                    ) : lastMsg ? (
                      <>
                        {senderIsMe && (
                          <span className="text-zinc-400">You: </span>
                        )}
                        {lastMsg.deleted_at
                          ? "Message deleted"
                          : lastMsg.content || "📎 Attachment"}
                      </>
                    ) : (
                      "No messages yet"
                    )}
                  </p>
                  {unread > 0 && (
                    <span className="shrink-0 ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-accent-start text-black text-[10px] font-bold flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-accent-start rounded-full animate-spin" />
          </div>
        )}
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}
