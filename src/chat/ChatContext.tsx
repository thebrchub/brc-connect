import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatWS, type ConnState } from "./ws";
import type { Message, RoomListItem } from "./types";
import { MsgType } from "./types";
import type { WireMessageEdit, WireSendConfirm, WireGroupCallEvent } from "./proto";
import { getToken } from "../api/client";
import { getUserId } from "../hooks/useRole";

interface TypingInfo {
  userId: string;
  roomId: string;
}

interface ReceiptInfo {
  userId: string;
  roomId: string;
  ts: number;
  status: string; // "read" | "delivered"
}

/** roomId → Map<userId, timestamp_ms> */
type ReadMap = Map<string, Map<string, number>>;

/** Tracks an active group call in a room */
export interface GroupCallInfo {
  roomId: string;
  initiatedBy: string;
  participants: Set<string>;
  startedAt?: number; // epoch ms — used for elapsed timer
  warningRemainingSec?: number; // set when server sends group_call_warning
}

/** Active 1:1 call state */
export type PeerCallState = "idle" | "ringing_out" | "ringing_in" | "connected";

export interface PeerCallInfo {
  callId: string;
  peerId: string;
  peerName?: string;
  hasVideo: boolean;
  state: PeerCallState;
  startedAt?: number; // Date.now() when connected
}

/** Incoming call signal event */
export interface CallSignalEvent {
  type: string;
  callId: string;
  from: string;
  to: string;
  hasVideo?: boolean;
  sdp?: string;
  ice?: string;
}

interface ChatContextValue {
  ws: ChatWS | null;
  connState: ConnState;
  /** Messages received in real-time (keyed by roomId) */
  realtimeMessages: Map<string, Message[]>;
  /** Typing indicators (roomId → userIds) */
  typingUsers: Map<string, Set<string>>;
  /** Per-room read timestamps: roomId → Map<userId, ts_ms> */
  roomReadAt: ReadMap;
  /** Send a chat message, returns temp ID */
  sendMessage: (roomId: string, text: string, replyTo?: string, mediaUrl?: string, mediaType?: string) => string;
  /** Send typing start indicator */
  sendTyping: (roomId: string) => void;
  /** Clear realtime messages for a room (after fetch merges them) */
  clearRealtimeMessages: (roomId: string) => void;
  /** Seed read timestamps from fetched member data */
  seedReadAt: (roomId: string, entries: { userId: string; ts: number }[]) => void;
  /** Timestamp (ms) when each room was last opened by the user */
  roomOpenedAt: Map<string, number>;
  /** Record that a room was opened now */
  markRoomOpened: (roomId: string) => void;
  /** Active group calls: roomId → GroupCallInfo */
  activeGroupCalls: Map<string, GroupCallInfo>;
  /** Active 1:1 peer call */
  peerCall: PeerCallInfo | null;
  /** Clear the peer call state (used by useCall on reject/accept/hangup) */
  clearPeerCall: () => void;
  /** Update peer call state (e.g. ringing_in → connected) */
  updatePeerCallState: (state: PeerCallState) => void;
  /** Last incoming call signal (for WebRTC negotiation) */
  lastCallSignal: CallSignalEvent | null;
  /** Total unread badge count across all rooms (for sidebar icon) */
  unreadBadgeCount: number;
  /** Whether there's an incoming call ringing (for sidebar icon) */
  hasIncomingCall: boolean;
  /** Set of currently online user IDs (from presence events) */
  onlineUsers: Set<string>;
}

const ChatContext = createContext<ChatContextValue>({
  ws: null,
  connState: "disconnected",
  realtimeMessages: new Map(),
  typingUsers: new Map(),
  roomReadAt: new Map(),
  sendMessage: () => "",
  sendTyping: () => {},
  clearRealtimeMessages: () => {},
  seedReadAt: () => {},
  roomOpenedAt: new Map(),
  markRoomOpened: () => {},
  activeGroupCalls: new Map(),
  peerCall: null,
  clearPeerCall: () => {},
  updatePeerCallState: () => {},
  lastCallSignal: null,
  unreadBadgeCount: 0,
  hasIncomingCall: false,
  onlineUsers: new Set(),
});

export function useChatContext() {
  return useContext(ChatContext);
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<ChatWS | null>(null);
  const [connState, setConnState] = useState<ConnState>("disconnected");
  const [realtimeMessages, setRealtimeMessages] = useState<Map<string, Message[]>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [roomReadAt, setRoomReadAt] = useState<ReadMap>(new Map());
  const [roomOpenedAt, setRoomOpenedAt] = useState<Map<string, number>>(new Map());
  const [activeGroupCalls, setActiveGroupCalls] = useState<Map<string, GroupCallInfo>>(new Map());
  const [peerCall, setPeerCall] = useState<PeerCallInfo | null>(null);
  const [lastCallSignal, setLastCallSignal] = useState<CallSignalEvent | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  // ── Unread badge + browser notifications ──────────────────────────
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0);
  const originalTitle = useRef(document.title);
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifAudio = useRef<HTMLAudioElement | null>(null);
  const currentUserId = getUserId() || "";
  const faviconCanvas = useRef<HTMLCanvasElement | null>(null);
  const originalFavicon = useRef<string>("");

  // Count unread messages from others across all rooms
  useEffect(() => {
    let count = 0;
    for (const [roomId, msgs] of realtimeMessages) {
      const openedAt = roomOpenedAt.get(roomId) ?? 0;
      count += msgs.filter(
        (m) => m.sender_id !== currentUserId && new Date(m.created_at).getTime() > openedAt
      ).length;
    }
    setUnreadBadgeCount(count);
  }, [realtimeMessages, roomOpenedAt, currentUserId]);

  // Tab title flash when there are unreads or incoming call
  const hasIncomingCall = peerCall?.state === "ringing_in";

  useEffect(() => {
    const needsFlash = unreadBadgeCount > 0 || hasIncomingCall;
    if (needsFlash) {
      let toggle = false;
      flashTimer.current = setInterval(() => {
        toggle = !toggle;
        if (hasIncomingCall) {
          document.title = toggle ? "Incoming Call!" : originalTitle.current;
        } else {
          document.title = toggle
            ? `(${unreadBadgeCount}) New message${unreadBadgeCount > 1 ? "s" : ""}`
            : originalTitle.current;
        }
      }, 1000);
    } else {
      document.title = originalTitle.current;
    }
    return () => {
      if (flashTimer.current) clearInterval(flashTimer.current);
      document.title = originalTitle.current;
    };
  }, [unreadBadgeCount, hasIncomingCall]);

  // Dynamic favicon badge overlay
  useEffect(() => {
    // Capture original favicon on first run
    if (!originalFavicon.current) {
      const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      originalFavicon.current = link?.href || "/favicon.ico";
    }
    if (!faviconCanvas.current) {
      faviconCanvas.current = document.createElement("canvas");
      faviconCanvas.current.width = 64;
      faviconCanvas.current.height = 64;
    }

    const needsBadge = unreadBadgeCount > 0 || hasIncomingCall;
    if (!needsBadge) {
      // Restore original favicon
      setFavicon(originalFavicon.current);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = faviconCanvas.current!;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(img, 0, 0, 64, 64);

      // Draw badge circle
      const badgeColor = hasIncomingCall ? "#22c55e" : "#f97316"; // green for call, orange for messages
      const radius = hasIncomingCall ? 12 : (unreadBadgeCount > 9 ? 16 : 12);
      const cx = 64 - radius;
      const cy = radius;

      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = "#000";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = badgeColor;
      ctx.fill();

      if (!hasIncomingCall && unreadBadgeCount > 0) {
        const text = unreadBadgeCount > 99 ? "99" : String(unreadBadgeCount);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${unreadBadgeCount > 9 ? 16 : 18}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy + 1);
      }

      setFavicon(canvas.toDataURL("image/png"));
    };
    img.src = originalFavicon.current;

    return () => {
      setFavicon(originalFavicon.current);
    };
  }, [unreadBadgeCount, hasIncomingCall]);

  // Notification sound on new message from others
  useEffect(() => {
    if (!notifAudio.current) {
      notifAudio.current = new Audio("/notif.mp3");
      notifAudio.current.volume = 0.3;
    }
  }, []);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    let total = 0;
    for (const msgs of realtimeMessages.values()) total += msgs.length;
    if (total > prevMsgCount.current && prevMsgCount.current > 0) {
      // New message arrived — play sound if from someone else
      const lastRoom = Array.from(realtimeMessages.entries()).find(
        ([, msgs]) => msgs.length > 0 && msgs[msgs.length - 1].sender_id !== currentUserId
      );
      if (lastRoom) {
        notifAudio.current?.play().catch(() => {});
      }
    }
    prevMsgCount.current = total;
  }, [realtimeMessages, currentUserId]);

  // Typing debounce timers
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Seed active group calls from REST API on mount (survives refresh)
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    fetch(`${API_URL}/chat/calls/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.active_calls?.length) return;
        setActiveGroupCalls((prev) => {
          const next = new Map(prev);
          for (const c of data.active_calls) {
            if (!next.has(c.room_id)) {
              next.set(c.room_id, {
                roomId: c.room_id,
                initiatedBy: c.started_by,
                participants: new Set(c.participants ?? []),
                startedAt: c.started_at,
              });
            }
          }
          return next;
        });
      })
      .catch(() => {}); // silent — non-critical
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const ws = new ChatWS();
    wsRef.current = ws;

    ws.on("state", (state: unknown) => setConnState(state as ConnState));

    ws.on("chat_message", (msg: unknown) => {
      const m = msg as Message;
      setRealtimeMessages((prev) => {
        const next = new Map(prev);
        const arr = next.get(m.room_id) ?? [];
        // Dedupe by ID
        if (!arr.find((x) => x.id === m.id)) {
          next.set(m.room_id, [...arr, m]);
        }
        return next;
      });
      // Update room list in-place: patch last_message + bump to top
      qc.setQueriesData<{
        pages: { rooms: RoomListItem[]; next_cursor: string }[];
        pageParams: string[];
      }>({ queryKey: ["chat-rooms"] }, (old) => {
        if (!old) return old;
        // Remove the room from wherever it is
        let found: RoomListItem | undefined;
        const pages = old.pages.map((page) => ({
          ...page,
          rooms: page.rooms.filter((r) => {
            if (r.id === m.room_id) {
              found = r;
              return false;
            }
            return true;
          }),
        }));
        // Patch and prepend to first page
        const updated: RoomListItem = {
          ...(found ?? { id: m.room_id, type: "dm" as const, unread_count: 0, updated_at: "" }),
          last_message: m,
          updated_at: new Date().toISOString(),
        };
        pages[0] = { ...pages[0], rooms: [updated, ...pages[0].rooms] };
        return { ...old, pages };
      });
    });

    ws.on("typing_start", (data: unknown) => {
      const t = data as TypingInfo;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(t.roomId) ?? []);
        set.add(t.userId);
        next.set(t.roomId, set);
        return next;
      });
      // Auto-clear typing after 4s
      const key = `${t.roomId}:${t.userId}`;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key));
      typingTimers.current.set(
        key,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            const set = new Set(next.get(t.roomId) ?? []);
            set.delete(t.userId);
            next.set(t.roomId, set);
            return next;
          });
          typingTimers.current.delete(key);
        }, 4000)
      );
    });

    ws.on("typing_stop", (data: unknown) => {
      const t = data as TypingInfo;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(t.roomId) ?? []);
        set.delete(t.userId);
        next.set(t.roomId, set);
        return next;
      });
    });

    ws.on("receipt", (data: unknown) => {
      const r = data as ReceiptInfo;
      if (r.status === "read" && r.roomId && r.userId) {
        setRoomReadAt((prev) => {
          const next = new Map(prev);
          const users = new Map(next.get(r.roomId) ?? []);
          const existing = users.get(r.userId) ?? 0;
          if (r.ts > existing) {
            users.set(r.userId, r.ts);
            next.set(r.roomId, users);
          }
          return next;
        });
      }
    });

    ws.on("message_edit", (data: unknown) => {
      const edit = data as WireMessageEdit;
      // Invalidate messages for all rooms (we don't know which room from edit alone)
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
      // Also update any realtime messages
      setRealtimeMessages((prev) => {
        const next = new Map(prev);
        for (const [roomId, msgs] of next) {
          const idx = msgs.findIndex((m) => m.id === edit.messageId);
          if (idx >= 0) {
            const updated = [...msgs];
            if (edit.deleted) {
              updated[idx] = { ...updated[idx], deleted_at: new Date().toISOString(), content: undefined };
            } else {
              updated[idx] = { ...updated[idx], content: edit.newText, edited_at: new Date().toISOString() };
            }
            next.set(roomId, updated);
          }
        }
        return next;
      });
    });

    ws.on("send_confirm", (data: unknown) => {
      const confirm = data as WireSendConfirm;
      // Replace temp ID with permanent ID in realtime messages
      setRealtimeMessages((prev) => {
        const next = new Map(prev);
        for (const [roomId, msgs] of next) {
          const idx = msgs.findIndex((m) => m.id === confirm.tempId);
          if (idx >= 0) {
            const updated = [...msgs];
            updated[idx] = { ...updated[idx], id: confirm.messageId };
            next.set(roomId, updated);
          }
        }
        return next;
      });
    });

    ws.on("room_event", () => {
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    });

    ws.on("group_call_event", (data: unknown) => {
      const ev = data as WireGroupCallEvent & { type: string };
      const rid = ev.roomId;
      if (!rid) return;

      setActiveGroupCalls((prev) => {
        const next = new Map(prev);

        switch (ev.type) {
          case MsgType.GROUP_CALL_STARTED: {
            next.set(rid, {
              roomId: rid,
              initiatedBy: ev.initiatedBy || ev.userId,
              participants: new Set(ev.members?.length ? ev.members : [ev.userId]),
              startedAt: Date.now(),
            });
            break;
          }
          case MsgType.GROUP_CALL_JOINED: {
            const info = next.get(rid);
            if (info) {
              const p = new Set(info.participants);
              p.add(ev.userId);
              next.set(rid, { ...info, participants: p });
            } else {
              // Joined but we missed the start — create entry
              next.set(rid, {
                roomId: rid,
                initiatedBy: ev.initiatedBy || ev.userId,
                participants: new Set([ev.userId]),
              });
            }
            break;
          }
          case MsgType.GROUP_CALL_LEFT: {
            const info = next.get(rid);
            if (info) {
              const p = new Set(info.participants);
              p.delete(ev.userId);
              if (p.size === 0) next.delete(rid);
              else next.set(rid, { ...info, participants: p });
            }
            break;
          }
          case MsgType.GROUP_CALL_ENDED: {
            next.delete(rid);
            break;
          }
          case MsgType.GROUP_CALL_WARNING: {
            const info = next.get(rid);
            if (info) {
              next.set(rid, { ...info, warningRemainingSec: (ev as any).remainingSec || 300 });
            }
            break;
          }
        }

        return next;
      });
    });

    ws.on("call_signal", (data: unknown) => {
      const ev = data as CallSignalEvent;
      setLastCallSignal(ev);

      switch (ev.type) {
        case MsgType.CALL_RING:
          // Incoming call
          setPeerCall({
            callId: ev.callId,
            peerId: ev.from,
            hasVideo: ev.hasVideo ?? false,
            state: "ringing_in",
          });
          break;
        case MsgType.CALL_ACCEPT:
          // Other side accepted our outgoing call
          setPeerCall((prev) =>
            prev?.callId === ev.callId ? { ...prev, state: "connected", startedAt: Date.now() } : prev
          );
          break;
        case MsgType.CALL_REJECT:
        case MsgType.CALL_END:
        case MsgType.CALL_MISSED:
        case MsgType.CALL_BUSY:
          // Call ended / rejected / busy / missed
          setPeerCall((prev) => (prev?.callId === ev.callId ? null : prev));
          break;
        // CALL_OFFER, CALL_ANSWER, CALL_ICE are handled by useCall hook via lastCallSignal
      }
    });

    ws.on("presence", (data: unknown) => {
      const p = data as { userId: string; online: boolean };
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (p.online) next.add(p.userId);
        else next.delete(p.userId);
        return next;
      });
    });

    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
      for (const t of typingTimers.current.values()) clearTimeout(t);
    };
  }, [qc]);

  const sendMessage = useCallback(
    (roomId: string, text: string, replyTo?: string, mediaUrl?: string, mediaType?: string) => {
      return wsRef.current?.sendChatMessage(roomId, text, replyTo, mediaUrl, mediaType) ?? "";
    },
    []
  );

  const sendTyping = useCallback((roomId: string) => {
    wsRef.current?.sendTypingStart(roomId);
  }, []);

  const clearRealtimeMessages = useCallback((roomId: string) => {
    setRealtimeMessages((prev) => {
      const next = new Map(prev);
      next.delete(roomId);
      return next;
    });
  }, []);

  const seedReadAt = useCallback((roomId: string, entries: { userId: string; ts: number }[]) => {
    setRoomReadAt((prev) => {
      const next = new Map(prev);
      const users = new Map(next.get(roomId) ?? []);
      for (const e of entries) {
        const existing = users.get(e.userId) ?? 0;
        if (e.ts > existing) users.set(e.userId, e.ts);
      }
      next.set(roomId, users);
      return next;
    });
  }, []);

  const markRoomOpened = useCallback((roomId: string) => {
    setRoomOpenedAt((prev) => {
      const next = new Map(prev);
      next.set(roomId, Date.now());
      return next;
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        ws: wsRef.current,
        connState,
        realtimeMessages,
        typingUsers,
        roomReadAt,
        roomOpenedAt,
        sendMessage,
        sendTyping,
        clearRealtimeMessages,
        seedReadAt,
        markRoomOpened,
        activeGroupCalls,
        peerCall,
        clearPeerCall: () => setPeerCall(null),
        updatePeerCallState: (state: PeerCallState) =>
          setPeerCall((prev) => (prev ? { ...prev, state } : prev)),
        lastCallSignal,
        unreadBadgeCount,
        hasIncomingCall,
        onlineUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
