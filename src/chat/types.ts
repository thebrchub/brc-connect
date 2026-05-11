// ── Chat domain types (mirrors backend models) ──

export interface RoomListItem {
  id: string;
  type: "dm" | "group";
  name?: string;
  avatar_url?: string;
  other_user_id?: string;
  other_name?: string;
  other_avatar_url?: string;
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

export interface Room {
  id: string;
  admin_id: string;
  type: "dm" | "group";
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  members?: RoomMember[];
  last_message?: Message;
  unread_count?: number;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  left_at?: string;
  last_read_at?: string;
  last_delivered_at?: string;
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content?: string;
  media_url?: string;
  media_type?: string;
  reply_to?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  sender_name?: string;
  sender_avatar_url?: string;
}

export interface CallLog {
  id: string;
  call_id: string;
  room_id?: string;
  initiated_by: string;
  peer_id?: string;
  call_type: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
  peer_name?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
}

// ── WS message type constants ──
export const MsgType = {
  CHAT_MESSAGE: "chat_message",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  PRESENCE_ONLINE: "presence_online",
  PRESENCE_OFFLINE: "presence_offline",
  READ: "read",
  DELIVERED: "delivered",
  ROOM_EVENT: "room_event",
  MESSAGE_EDIT: "message_edit",
  SYSTEM: "system",
  SEND_CONFIRM: "send_confirm",
  PING: "ping",
  PONG: "pong",
  // Group call lifecycle
  GROUP_CALL_STARTED: "group_call_started",
  GROUP_CALL_ENDED: "group_call_ended",
  GROUP_CALL_JOINED: "group_call_joined",
  GROUP_CALL_LEFT: "group_call_left",
  GROUP_CALL_WARNING: "group_call_warning",
  // 1:1 call signaling
  CALL_RING: "call_ring",
  CALL_ACCEPT: "call_accept",
  CALL_REJECT: "call_reject",
  CALL_OFFER: "call_offer",
  CALL_ANSWER: "call_answer",
  CALL_ICE: "call_ice",
  CALL_END: "call_end",
  CALL_MISSED: "call_missed",
  CALL_BUSY: "call_busy",
} as const;
