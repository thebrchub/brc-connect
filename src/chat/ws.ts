/**
 * WebSocket client for chat — binary protobuf frames,
 * exponential backoff reconnect, event-driven.
 */
import { getToken } from "../api/client";
import {
  encodeEnvelope,
  encodeChatMessage,
  encodeTypingEvent,
  encodeCallSignal,
  decodeEnvelope,
  decodeChatMessage,
  decodeTypingEvent,
  decodePresenceEvent,
  decodeReceipt,
  decodeRoomEvent,
  decodeMessageEdit,
  decodeSystemEvent,
  decodeSendConfirm,
  decodeGroupCallEvent,
  decodeCallSignal,
  type WireEnvelope,
} from "./proto";
import { MsgType, type Message } from "./types";

// ── Connection state ──
export type ConnState = "connecting" | "connected" | "disconnected";

type Listener = (...args: unknown[]) => void;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function wsUrl(): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws?token=${getToken()}`;
}

export class ChatWS {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private maxBackoff = 30_000;
  private disposed = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  state: ConnState = "disconnected";

  connect() {
    if (this.disposed) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.state = "connecting";
    this.emit("state", this.state);

    const url = wsUrl();
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.state = "connected";
      this.attempt = 0;
      this.emit("state", this.state);
      this.startPing();
    };

    this.ws.onclose = () => {
      this.state = "disconnected";
      this.emit("state", this.state);
      this.stopPing();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose fires after onerror
    };

    this.ws.onmessage = (ev) => {
      const data = new Uint8Array(ev.data as ArrayBuffer);
      this.handleFrame(data);
    };
  }

  disconnect() {
    this.disposed = true;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.state = "disconnected";
    this.emit("state", this.state);
  }

  // ── Send helpers ──

  sendChatMessage(roomId: string, text: string, replyTo?: string, mediaUrl?: string, mediaType?: string): string {
    const tempId = crypto.randomUUID();
    const payload = encodeChatMessage({ text, replyTo: replyTo || "", mediaUrl: mediaUrl || "", mediaType: mediaType || "" });
    const envelope = encodeEnvelope({
      type: MsgType.CHAT_MESSAGE,
      roomId,
      payload,
      id: tempId,
    });
    this.send(envelope);
    return tempId;
  }

  sendTypingStart(roomId: string) {
    const payload = encodeTypingEvent({ roomId });
    const envelope = encodeEnvelope({
      type: MsgType.TYPING_START,
      roomId,
      payload,
    });
    this.send(envelope);
  }

  sendTypingStop(roomId: string) {
    const payload = encodeTypingEvent({ roomId });
    const envelope = encodeEnvelope({
      type: MsgType.TYPING_STOP,
      roomId,
      payload,
    });
    this.send(envelope);
  }

  sendReadReceipt(roomId: string) {
    const envelope = encodeEnvelope({
      type: MsgType.READ,
      roomId,
    });
    this.send(envelope);
  }

  // ── 1:1 call signaling ──

  sendCallRing(callId: string, to: string, hasVideo: boolean) {
    const payload = encodeCallSignal({ hasVideo });
    const envelope = encodeEnvelope({
      type: MsgType.CALL_RING,
      to,
      id: callId,
      payload,
    });
    this.send(envelope);
  }

  sendCallAccept(callId: string, to: string) {
    const envelope = encodeEnvelope({
      type: MsgType.CALL_ACCEPT,
      to,
      id: callId,
    });
    this.send(envelope);
  }

  sendCallReject(callId: string, to: string) {
    const envelope = encodeEnvelope({
      type: MsgType.CALL_REJECT,
      to,
      id: callId,
    });
    this.send(envelope);
  }

  sendCallEnd(callId: string, to: string) {
    const envelope = encodeEnvelope({
      type: MsgType.CALL_END,
      to,
      id: callId,
    });
    this.send(envelope);
  }

  sendCallOffer(callId: string, to: string, sdp: string) {
    const payload = encodeCallSignal({ sdp });
    const envelope = encodeEnvelope({
      type: MsgType.CALL_OFFER,
      to,
      id: callId,
      payload,
    });
    this.send(envelope);
  }

  sendCallAnswer(callId: string, to: string, sdp: string) {
    const payload = encodeCallSignal({ sdp });
    const envelope = encodeEnvelope({
      type: MsgType.CALL_ANSWER,
      to,
      id: callId,
      payload,
    });
    this.send(envelope);
  }

  sendCallICE(callId: string, to: string, ice: string) {
    const payload = encodeCallSignal({ ice });
    const envelope = encodeEnvelope({
      type: MsgType.CALL_ICE,
      to,
      id: callId,
      payload,
    });
    this.send(envelope);
  }

  private send(data: Uint8Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(new Uint8Array(data) as unknown as ArrayBuffer);
    }
  }

  // ── Receive ──

  private handleFrame(data: Uint8Array) {
    let env: WireEnvelope;
    try {
      env = decodeEnvelope(data);
    } catch {
      return;
    }

    const payload = env.payload;

    switch (env.type) {
      case MsgType.CHAT_MESSAGE: {
        const cm = decodeChatMessage(payload);
        const msg: Message = {
          id: env.id,
          room_id: env.roomId,
          sender_id: env.from,
          content: cm.text,
          media_url: cm.mediaUrl || undefined,
          media_type: cm.mediaType || undefined,
          reply_to: cm.replyTo || undefined,
          created_at: new Date(env.ts).toISOString(),
        };
        this.emit("chat_message", msg);
        break;
      }
      case MsgType.TYPING_START: {
        const t = decodeTypingEvent(payload);
        this.emit("typing_start", { userId: t.userId || env.from, roomId: t.roomId || env.roomId });
        break;
      }
      case MsgType.TYPING_STOP: {
        const t = decodeTypingEvent(payload);
        this.emit("typing_stop", { userId: t.userId || env.from, roomId: t.roomId || env.roomId });
        break;
      }
      case MsgType.PRESENCE_ONLINE:
      case MsgType.PRESENCE_OFFLINE: {
        this.emit("presence", {
          userId: env.from,
          online: env.type === MsgType.PRESENCE_ONLINE,
          ts: env.ts,
        });
        break;
      }
      case MsgType.READ:
      case MsgType.DELIVERED: {
        // Receipt may have empty payload — use envelope fields as fallback
        let r: { userId?: string; roomId?: string; ts?: number } = {};
        if (payload?.length) {
          try { r = decodeReceipt(payload); } catch { /* empty payload */ }
        }
        this.emit("receipt", {
          userId: r.userId || env.from,
          roomId: r.roomId || env.roomId,
          ts: r.ts || env.ts,
          status: env.type,
        });
        break;
      }
      case MsgType.ROOM_EVENT: {
        const re = decodeRoomEvent(payload);
        this.emit("room_event", re);
        break;
      }
      case MsgType.MESSAGE_EDIT: {
        const me = decodeMessageEdit(payload);
        this.emit("message_edit", me);
        break;
      }
      case MsgType.SYSTEM: {
        const se = decodeSystemEvent(payload);
        this.emit("system", se);
        break;
      }
      case MsgType.SEND_CONFIRM: {
        const sc = decodeSendConfirm(payload);
        this.emit("send_confirm", sc);
        break;
      }
      case MsgType.GROUP_CALL_STARTED:
      case MsgType.GROUP_CALL_ENDED:
      case MsgType.GROUP_CALL_JOINED:
      case MsgType.GROUP_CALL_LEFT: {
        const gc = decodeGroupCallEvent(payload);
        this.emit("group_call_event", { ...gc, type: env.type });
        break;
      }
      case MsgType.GROUP_CALL_WARNING: {
        const gc = decodeGroupCallEvent(payload);
        this.emit("group_call_event", { ...gc, type: env.type, remainingSec: Number(env.ts) || 0 });
        break;
      }
      case MsgType.CALL_RING:
      case MsgType.CALL_ACCEPT:
      case MsgType.CALL_REJECT:
      case MsgType.CALL_END:
      case MsgType.CALL_MISSED:
      case MsgType.CALL_BUSY: {
        // Call lifecycle events — decode CallSignal if payload present
        let sig = {} as { sdp?: string; ice?: string; hasVideo?: boolean };
        if (payload?.length) {
          try { sig = decodeCallSignal(payload); } catch { /* empty */ }
        }
        this.emit("call_signal", {
          type: env.type,
          callId: env.id,
          from: env.from,
          to: env.to,
          hasVideo: sig.hasVideo ?? false,
        });
        break;
      }
      case MsgType.CALL_OFFER:
      case MsgType.CALL_ANSWER: {
        const sig = decodeCallSignal(payload);
        this.emit("call_signal", {
          type: env.type,
          callId: env.id,
          from: env.from,
          to: env.to,
          sdp: sig.sdp,
        });
        break;
      }
      case MsgType.CALL_ICE: {
        const sig = decodeCallSignal(payload);
        this.emit("call_signal", {
          type: env.type,
          callId: env.id,
          from: env.from,
          to: env.to,
          ice: sig.ice,
        });
        break;
      }
      case MsgType.PONG:
        // heartbeat response — ignore
        break;
      default:
        break;
    }
  }

  // ── Ping keepalive ──

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      const envelope = encodeEnvelope({ type: MsgType.PING });
      this.send(envelope);
    }, 25_000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ── Reconnect ──

  private scheduleReconnect() {
    if (this.disposed) return;
    const delay = Math.min(1000 * 2 ** this.attempt, this.maxBackoff);
    this.attempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  // ── EventEmitter ──

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  off(event: string, fn: Listener) {
    this.listeners.get(event)?.delete(fn);
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}
