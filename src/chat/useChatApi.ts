import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, getToken } from "../api/client";
import type { RoomListItem, Room, RoomMember, Message, ChatUser } from "./types";

// ── File upload (presigned PUT → direct S3 upload) ──
interface PresignResponse {
  upload_url: string;
  file_url: string;
  key: string;
}

/** Request a presigned upload URL, then upload the file directly to S3. Returns the public file URL. */
export async function uploadChatFile(file: File): Promise<{ fileUrl: string; mediaType: string }> {
  const API_URL = import.meta.env.VITE_API_URL || "https://connect-api.brchub.tech";
  const token = getToken();

  // 1. Get presigned URL from backend
  const res = await fetch(`${API_URL}/chat/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Failed to get upload URL");
  }
  const presign: PresignResponse = await res.json();

  // 2. Upload directly to S3 via presigned PUT
  const uploadRes = await fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error("File upload failed");
  }

  // Determine media type category
  let mediaType = "file";
  if (file.type.startsWith("image/")) mediaType = "image";
  else if (file.type.startsWith("video/")) mediaType = "video";
  else if (file.type.startsWith("audio/")) mediaType = "audio";

  return { fileUrl: presign.key, mediaType };
}

/** Resolve a chat file key to a presigned download URL. */
export async function getChatFileUrl(key: string): Promise<string> {
  const { url } = await api.get<{ url: string }>(`/chat/file?key=${encodeURIComponent(key)}`);
  return url;
}

function normalizeChatKey(mediaUrl?: string) {
  if (!mediaUrl) return undefined;

  try {
    const parsed = new URL(mediaUrl);
    const path = parsed.pathname;
    const idx = path.indexOf("/chat/");
    if (idx >= 0) {
      const key = path.slice(idx + 1).split("?")[0].split("#")[0];
      return key.startsWith("chat/") ? key : `chat/${key}`;
    }
  } catch {
    // fall back to plain string handling
  }

  const raw = mediaUrl.split("/chat/").pop()?.split("?")[0]?.split("#")[0];
  return raw ? `chat/${raw}` : mediaUrl;
}

/** Hook that resolves a media_url (S3 key like chat/...) to a presigned download URL. */
export function useChatFileUrl(mediaUrl?: string) {
  const key = normalizeChatKey(mediaUrl);

  return useQuery({
    queryKey: ["chat-file-url", key],
    queryFn: () => getChatFileUrl(key!),
    enabled: !!key && key.startsWith("chat/"),
    staleTime: 25 * 60 * 1000, // 25 min (presigned URLs valid 30 min)
    gcTime: 25 * 60 * 1000,
  });
}

// ── Profile & Avatar ──
interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
  created_at: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<Profile>("/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; presence_hidden?: boolean }) => api.patch("/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const presign = await api.post<{ upload_url: string; key: string }>("/profile/avatar", {
        file_name: file.name,
        content_type: file.type,
      });
      const uploadRes = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Avatar upload failed");
      return presign.key;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["chat-contacts"] });
    },
  });
}

/** Resolve an avatar key (avatars/...) to a presigned download URL. */
export function useAvatarUrl(avatarKey?: string) {
  return useQuery({
    queryKey: ["avatar-url", avatarKey],
    queryFn: () => api.get<{ url: string }>(`/profile/avatar?key=${encodeURIComponent(avatarKey!)}`).then(r => r.url),
    enabled: !!avatarKey && avatarKey.startsWith("avatars/"),
    staleTime: 25 * 60 * 1000,
    gcTime: 25 * 60 * 1000,
  });
}

// ── Call config (ICE servers + LiveKit URL) ──
interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}
interface CallConfig {
  iceServers: ICEServer[];
  livekit?: { url: string };
}
export function useCallConfig() {
  return useQuery({
    queryKey: ["call-config"],
    queryFn: () => api.get<CallConfig>("/chat/calls/config"),
    staleTime: 5 * 60_000, // cache for 5 min
  });
}

// ── Active group calls (polled to keep sidebar in sync after refresh) ──
export interface ActiveCallDTO {
  room_id: string;
  started_by: string;
  started_at: number;
}
export function useActiveCalls() {
  return useQuery({
    queryKey: ["active-calls"],
    queryFn: () => api.get<{ active_calls: ActiveCallDTO[] }>("/chat/calls/active"),
    refetchInterval: 30_000, // poll every 30s to catch calls started while tab was idle
  });
}

// ── Room list (cursor-paginated) ──
export function useRooms() {
  return useInfiniteQuery({
    queryKey: ["chat-rooms"],
    queryFn: ({ pageParam }) => {
      const qs = pageParam ? `?cursor=${pageParam}&limit=30` : "?limit=30";
      return api.get<{ rooms: RoomListItem[]; next_cursor: string }>(
        `/chat/rooms${qs}`
      );
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
}

// ── Room messages (cursor-paginated) ──
export function useMessages(roomId: string, cursor?: string) {
  return useQuery({
    queryKey: ["chat-messages", roomId, cursor],
    queryFn: () => {
      const qs = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";
      return api.get<{ messages: Message[]; next_cursor: string }>(
        `/chat/rooms/${roomId}/messages${qs}`
      );
    },
    enabled: !!roomId,
  });
}

// ── Mark room as read ──
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<void>(`/chat/rooms/${roomId}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-rooms"] }),
  });
}

// ── Room members ──
export function useRoomMembers(roomId: string) {
  return useQuery({
    queryKey: ["chat-members", roomId],
    queryFn: () => api.get<RoomMember[]>(`/chat/groups/${roomId}/members`),
    enabled: !!roomId,
  });
}

// ── Create DM ──
export function useCreateDM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<Room>("/chat/rooms/dm", { user_id: userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-rooms"] }),
  });
}

// ── Create group ──
export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; member_ids: string[] }) =>
      api.post<Room>("/chat/groups", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-rooms"] }),
  });
}

// ── Update group name ──
export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<void>(`/chat/groups/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-rooms"] }),
  });
}

export function useUploadGroupAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, file }: { roomId: string; file: File }) => {
      const presign = await api.post<{ upload_url: string; key: string }>(
        `/chat/groups/${roomId}/avatar`,
        { file_name: file.name, content_type: file.type }
      );
      const uploadRes = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Group avatar upload failed");
      return presign.key;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

// ── Add members ──
export function useAddMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userIds }: { roomId: string; userIds: string[] }) =>
      api.post<void>(`/chat/groups/${roomId}/members`, { user_ids: userIds }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["chat-members", v.roomId] });
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

// ── Remove member ──
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      api.delete<void>(`/chat/groups/${roomId}/members/${userId}`),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["chat-members", v.roomId] });
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

// ── Leave group ──
export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<void>(`/chat/groups/${roomId}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-rooms"] }),
  });
}

// ── Promote member to admin ──
export function usePromoteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      api.post<void>(`/chat/groups/${roomId}/members/${userId}/promote`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chat-members", v.roomId] }),
  });
}

// ── Demote member from admin ──
export function useDemoteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      api.post<void>(`/chat/groups/${roomId}/members/${userId}/demote`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["chat-members", v.roomId] }),
  });
}

// ── Edit message ──
export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.patch<void>(`/chat/messages/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages"] }),
  });
}

// ── Delete message ──
export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/chat/messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages"] }),
  });
}

// ── Contact list (employees for admin, employees + admin for employee) ──
export function useContacts() {
  return useQuery({
    queryKey: ["chat-contacts"],
    queryFn: async () => {
      // Try employees list first (admin view)
      try {
        const employees = await api.get<{ data: ChatUser[] } | ChatUser[]>(
          "/users/employees"
        );
        // Backend may return {data:[...]} or [...] directly
        return Array.isArray(employees) ? employees : employees.data ?? [];
      } catch {
        return [] as ChatUser[];
      }
    },
  });
}

// ── Search org contacts by name or email ──
export function useSearchContacts(query: string) {
  return useQuery({
    queryKey: ["chat-contacts-search", query],
    queryFn: () =>
      api
        .get<{ results: ChatUser[] }>(
          `/chat/contacts/search?q=${encodeURIComponent(query)}&limit=10`
        )
        .then((r) => r.results),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

// ── Group call mutations ──

export function useStartGroupCall() {
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<{ token: string }>(`/chat/groups/${roomId}/call/start`),
  });
}

export function useJoinGroupCall() {
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<{ token: string }>(`/chat/groups/${roomId}/call/join`),
  });
}

export function useLeaveGroupCall() {
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<void>(`/chat/groups/${roomId}/call/leave`),
  });
}

export function useEndGroupCall() {
  return useMutation({
    mutationFn: (roomId: string) =>
      api.post<void>(`/chat/groups/${roomId}/call/end`),
  });
}

// ── Call history (cursor-paginated) ──
export function useCallHistory() {
  return useInfiniteQuery({
    queryKey: ["call-history"],
    queryFn: async ({ pageParam }) => {
      const qs = pageParam ? `?cursor=${pageParam}&limit=20` : "?limit=20";
      const res = await api.get<{ calls: import("./types").CallLog[] | null; next_cursor: string }>(
        `/chat/calls${qs}`
      );
      return { calls: res.calls ?? [], next_cursor: res.next_cursor };
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
}

// ── Message search ──
export interface MessageSearchResult {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar_url: string;
  room_name: string;
  room_avatar_url: string;
  room_type: "dm" | "group";
}

export function useSearchMessages(query: string) {
  return useQuery({
    queryKey: ["chat-search", query],
    queryFn: () =>
      api.get<{ results: MessageSearchResult[] }>(
        `/chat/messages/search?q=${encodeURIComponent(query)}&limit=20`
      ),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
