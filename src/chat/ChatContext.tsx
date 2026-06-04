import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

export interface GroupCallInfo {
  roomId: string;
  initiatedBy: string;
  participants: Set<string>;
  startedAt?: number; 
  warningRemainingSec?: number; 
}

export type PeerCallState = "idle" | "ringing_out" | "ringing_in" | "connected";

export interface PeerCallInfo {
  callId: string;
  peerId: string;
  peerName?: string;
  hasVideo: boolean;
  state: PeerCallState;
  startedAt?: number; 
}

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
  realtimeMessages: Map<string, Message[]>;
  typingUsers: Map<string, Set<string>>;
  roomReadAt: ReadMap;
  sendMessage: (roomId: string, text: string, replyTo?: string, mediaUrl?: string, mediaType?: string) => string;
  sendTyping: (roomId: string) => void;
  clearRealtimeMessages: (roomId: string) => void;
  seedReadAt: (roomId: string, entries: { userId: string; ts: number }[]) => void;
  roomOpenedAt: Map<string, number>;
  markRoomOpened: (roomId: string) => void;
  activeGroupCalls: Map<string, GroupCallInfo>;
  peerCall: PeerCallInfo | null;
  clearPeerCall: () => void;
  updatePeerCallState: (state: PeerCallState) => void;
  lastCallSignal: CallSignalEvent | null;
  unreadBadgeCount: number;
  hasIncomingCall: boolean;
  onlineUsers: Set<string>;
  
  // ── Global State Persistence ──
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;
}

type ReadMap = Map<string, Map<string, number>>;

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
  activeRoomId: null,
  setActiveRoomId: () => {},
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

  // ── Global Active Room Persistence ──
  const [activeRoomId, _setActiveRoomId] = useState<string | null>(() => sessionStorage.getItem("activeChatRoomId"));
  const activeRoomIdRef = useRef<string | null>(activeRoomId);

  const setActiveRoomId = useCallback((id: string | null) => {
    if (id) sessionStorage.setItem("activeChatRoomId", id);
    else sessionStorage.removeItem("activeChatRoomId");
    activeRoomIdRef.current = id;
    _setActiveRoomId(id);
  }, []);

  // ── Unread badge + browser notifications ──
  const originalTitle = useRef(document.title);
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifAudio = useRef<HTMLAudioElement | null>(null);
  const currentUserId = getUserId() || "";
  const faviconCanvas = useRef<HTMLCanvasElement | null>(null);
  const originalFavicon = useRef<string>("");

  const unreadBadgeCount = useMemo(() => {
    const chatRooms = qc
      .getQueriesData<{ pages: { rooms: RoomListItem[]; next_cursor: string }[] }>({ queryKey: ["chat-rooms"] })
      .flatMap(([, data]) => data?.pages?.flatMap((page) => page.rooms) ?? []);

    const roomMap = new Map(chatRooms.map((room) => [room.id, room] as const));
    const rtCountByRoom = new Map<string, number>();

    for (const [roomId, msgs] of realtimeMessages) {
      const openedAt = roomOpenedAt.get(roomId) ?? 0;
      const incoming = msgs.filter((m) => {
        if (m.sender_id === currentUserId) return false;
        if (openedAt > 0) {
          return new Date(m.created_at).getTime() > openedAt;
        }
        return true;
      });
      rtCountByRoom.set(roomId, incoming.length);
    }

    const roomIds = new Set<string>([
      ...chatRooms.map((room) => room.id),
      ...realtimeMessages.keys(),
    ]);

    return Array.from(roomIds).reduce((total, roomId) => {
      const serverUnread = roomMap.get(roomId)?.unread_count ?? 0;
      const realtimeUnread = rtCountByRoom.get(roomId) ?? 0;
      return total + Math.max(serverUnread, realtimeUnread);
    }, 0);
  }, [qc, realtimeMessages, roomOpenedAt, currentUserId]);

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

      const badgeColor = hasIncomingCall ? "#22c55e" : "#f97316"; 
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

  // Pre-load notification sound
  useEffect(() => {
    if (!notifAudio.current) {
      notifAudio.current = new Audio("/message.mp3");
      notifAudio.current.volume = 0.5;
    }
  }, []);

  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "https://connect-api.brchub.tech";
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
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    qc.refetchQueries({ queryKey: ["chat-rooms"], type: "active" });

    const ws = new ChatWS();
    wsRef.current = ws;

    ws.on("state", (state: unknown) => setConnState(state as ConnState));

    ws.on("chat_message", (msg: unknown) => {
      const m = msg as Message;

      // Enrich with sender name/avatar from cached room members (fixes "?" avatar in groups)
      if (!m.sender_name && m.sender_id) {
        const members = qc.getQueryData<import("./types").RoomMember[]>(["chat-members", m.room_id]);
        const member = members?.find((mem) => mem.user_id === m.sender_id);
        if (member) {
          m.sender_name = member.user_name;
          m.sender_avatar_url = member.user_avatar_url;
        }
      }
      
      // ── New Message Sound Logic ──
      if (m.sender_id !== currentUserId) {
        // Check if the user is actively viewing this specific chat room and the browser tab is focused
        const isActivelyViewingChat = m.room_id === activeRoomIdRef.current && document.visibilityState === "visible";
        
        // If they are not actively reading it, ping the notification!
        if (!isActivelyViewingChat) {
          notifAudio.current?.play().catch(() => {});
        }
      }

      setRealtimeMessages((prev) => {
        const next = new Map(prev);
        const arr = next.get(m.room_id) ?? [];
        if (!arr.find((x) => x.id === m.id)) {
          next.set(m.room_id, [...arr, m]);
        }
        return next;
      });

      qc.setQueriesData<{
        pages: { rooms: RoomListItem[]; next_cursor: string }[];
        pageParams: string[];
      }>({ queryKey: ["chat-rooms"] }, (old) => {
        if (!old) return old;
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
      qc.invalidateQueries({ queryKey: ["chat-messages"] });
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
          setPeerCall({
            callId: ev.callId,
            peerId: ev.from,
            hasVideo: ev.hasVideo ?? false,
            state: "ringing_in",
          });
          break;
        case MsgType.CALL_ACCEPT:
          setPeerCall((prev) =>
            prev?.callId === ev.callId ? { ...prev, state: "connected", startedAt: Date.now() } : prev
          );
          break;
        case MsgType.CALL_REJECT:
        case MsgType.CALL_END:
        case MsgType.CALL_MISSED:
        case MsgType.CALL_BUSY:
          setPeerCall((prev) => (prev?.callId === ev.callId ? null : prev));
          break;
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
        activeRoomId,
        setActiveRoomId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}