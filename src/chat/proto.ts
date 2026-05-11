/**
 * Protobuf encode/decode for chat wire format.
 * Uses protobufjs/light with inline JSON descriptors — no codegen needed.
 */
import * as protobuf from "protobufjs/light";

// ── Schema ──
const root = protobuf.Root.fromJSON({
  nested: {
    chatpb: {
      nested: {
        Envelope: {
          fields: {
            type: { type: "string", id: 1 },
            roomId: { type: "string", id: 2 },
            from: { type: "string", id: 3 },
            to: { type: "string", id: 4 },
            payload: { type: "bytes", id: 5 },
            ts: { type: "int64", id: 6 },
            id: { type: "string", id: 7 },
          },
        },
        ChatMessage: {
          fields: {
            text: { type: "string", id: 1 },
            mediaUrl: { type: "string", id: 2 },
            mediaType: { type: "string", id: 3 },
            replyTo: { type: "string", id: 4 },
          },
        },
        TypingEvent: {
          fields: {
            userId: { type: "string", id: 1 },
            roomId: { type: "string", id: 2 },
          },
        },
        PresenceEvent: {
          fields: {
            userId: { type: "string", id: 1 },
            online: { type: "bool", id: 2 },
            ts: { type: "int64", id: 3 },
          },
        },
        Receipt: {
          fields: {
            messageId: { type: "string", id: 1 },
            userId: { type: "string", id: 2 },
            roomId: { type: "string", id: 3 },
            status: { type: "string", id: 4 },
            ts: { type: "int64", id: 5 },
          },
        },
        RoomEvent: {
          fields: {
            roomId: { type: "string", id: 1 },
            userId: { type: "string", id: 2 },
            action: { type: "string", id: 3 },
          },
        },
        MessageEdit: {
          fields: {
            messageId: { type: "string", id: 1 },
            newText: { type: "string", id: 2 },
            deleted: { type: "bool", id: 3 },
          },
        },
        SystemEvent: {
          fields: {
            code: { type: "string", id: 1 },
            message: { type: "string", id: 2 },
          },
        },
        SendConfirm: {
          fields: {
            tempId: { type: "string", id: 1 },
            messageId: { type: "string", id: 2 },
          },
        },
        GroupCallEvent: {
          fields: {
            roomId: { type: "string", id: 1 },
            userId: { type: "string", id: 2 },
            action: { type: "string", id: 3 },
            initiatedBy: { type: "string", id: 4 },
            members: { type: "string", id: 5, rule: "repeated" },
          },
        },
        CallSignal: {
          fields: {
            callId: { type: "string", id: 1 },
            callerId: { type: "string", id: 2 },
            calleeId: { type: "string", id: 3 },
            action: { type: "string", id: 4 },
            sdp: { type: "string", id: 5 },
            ice: { type: "string", id: 6 },
            mediaType: { type: "string", id: 7 },
            hasVideo: { type: "bool", id: 8 },
          },
        },
      },
    },
  },
});

// ── Resolved types ──
const EnvelopeType = root.lookupType("chatpb.Envelope");
const ChatMessageType = root.lookupType("chatpb.ChatMessage");
const TypingEventType = root.lookupType("chatpb.TypingEvent");
const MessageEditType = root.lookupType("chatpb.MessageEdit");
const PresenceEventType = root.lookupType("chatpb.PresenceEvent");
const ReceiptType = root.lookupType("chatpb.Receipt");
const RoomEventType = root.lookupType("chatpb.RoomEvent");
const SystemEventType = root.lookupType("chatpb.SystemEvent");
const SendConfirmType = root.lookupType("chatpb.SendConfirm");
const GroupCallEventType = root.lookupType("chatpb.GroupCallEvent");
const CallSignalType = root.lookupType("chatpb.CallSignal");

// ── TS interfaces for decoded wire objects ──
export interface WireEnvelope {
  type: string;
  roomId: string;
  from: string;
  to: string;
  payload: Uint8Array;
  ts: number;
  id: string;
}

export interface WireChatMessage {
  text: string;
  mediaUrl: string;
  mediaType: string;
  replyTo: string;
}

export interface WireTypingEvent {
  userId: string;
  roomId: string;
}

export interface WirePresenceEvent {
  userId: string;
  online: boolean;
  ts: number;
}

export interface WireReceipt {
  messageId: string;
  userId: string;
  roomId: string;
  status: string;
  ts: number;
}

export interface WireRoomEvent {
  roomId: string;
  userId: string;
  action: string;
}

export interface WireMessageEdit {
  messageId: string;
  newText: string;
  deleted: boolean;
}

export interface WireSystemEvent {
  code: string;
  message: string;
}

export interface WireSendConfirm {
  tempId: string;
  messageId: string;
}

export interface WireGroupCallEvent {
  roomId: string;
  userId: string;
  action: string;
  initiatedBy: string;
  members: string[];
}

export interface WireCallSignal {
  callId: string;
  callerId: string;
  calleeId: string;
  action: string;
  sdp: string;
  ice: string;
  mediaType: string;
  hasVideo: boolean;
}

// ── Encode helpers ──

export function encodeEnvelope(obj: Partial<WireEnvelope>): Uint8Array {
  const msg = EnvelopeType.create(obj);
  return EnvelopeType.encode(msg).finish();
}

export function encodeChatMessage(obj: Partial<WireChatMessage>): Uint8Array {
  const msg = ChatMessageType.create(obj);
  return ChatMessageType.encode(msg).finish();
}

export function encodeTypingEvent(obj: Partial<WireTypingEvent>): Uint8Array {
  const msg = TypingEventType.create(obj);
  return TypingEventType.encode(msg).finish();
}

export function encodeMessageEdit(obj: Partial<WireMessageEdit>): Uint8Array {
  const msg = MessageEditType.create(obj);
  return MessageEditType.encode(msg).finish();
}

// ── Decode helpers ──

export function decodeEnvelope(data: Uint8Array): WireEnvelope {
  const obj = EnvelopeType.decode(data) as unknown as WireEnvelope;
  // protobufjs uses Long for int64 — coerce to number
  obj.ts = Number(obj.ts);
  return obj;
}

export function decodeChatMessage(data: Uint8Array): WireChatMessage {
  return ChatMessageType.decode(data) as unknown as WireChatMessage;
}

export function decodeTypingEvent(data: Uint8Array): WireTypingEvent {
  return TypingEventType.decode(data) as unknown as WireTypingEvent;
}

export function decodePresenceEvent(data: Uint8Array): WirePresenceEvent {
  const obj = PresenceEventType.decode(data) as unknown as WirePresenceEvent;
  obj.ts = Number(obj.ts);
  return obj;
}

export function decodeReceipt(data: Uint8Array): WireReceipt {
  const obj = ReceiptType.decode(data) as unknown as WireReceipt;
  obj.ts = Number(obj.ts);
  return obj;
}

export function decodeRoomEvent(data: Uint8Array): WireRoomEvent {
  return RoomEventType.decode(data) as unknown as WireRoomEvent;
}

export function decodeMessageEdit(data: Uint8Array): WireMessageEdit {
  return MessageEditType.decode(data) as unknown as WireMessageEdit;
}

export function decodeSystemEvent(data: Uint8Array): WireSystemEvent {
  return SystemEventType.decode(data) as unknown as WireSystemEvent;
}

export function decodeSendConfirm(data: Uint8Array): WireSendConfirm {
  return SendConfirmType.decode(data) as unknown as WireSendConfirm;
}

export function decodeGroupCallEvent(data: Uint8Array): WireGroupCallEvent {
  return GroupCallEventType.decode(data) as unknown as WireGroupCallEvent;
}

export function encodeCallSignal(obj: Partial<WireCallSignal>): Uint8Array {
  const msg = CallSignalType.create(obj);
  return CallSignalType.encode(msg).finish();
}

export function decodeCallSignal(data: Uint8Array): WireCallSignal {
  return CallSignalType.decode(data) as unknown as WireCallSignal;
}
