import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, WifiOff, Loader2} from "lucide-react";
import toast from "react-hot-toast";
import { getUserId, getUserRole } from "../hooks/useRole";
import { useChatContext } from "../chat/ChatContext";
import ChatSidebar from "../chat/ChatSidebar";
import MessageList from "../chat/MessageList";
import MessageInput from "../chat/MessageInput";
import NewDMModal from "../chat/NewDMModal";
import NewGroupModal from "../chat/NewGroupModal";
import GroupCallPanel from "../chat/GroupCallPanel";
import GroupInfoPanel from "../chat/GroupInfoPanel";
import Avatar from "../chat/Avatar";
import { useCallContext } from "../chat/CallContext";
import {
  useRooms,
  useMessages,
  useContacts,
  useCreateDM,
  useCreateGroup,
  useEditMessage,
  useDeleteMessage,
  useRoomMembers,
} from "../chat/useChatApi";
import type { Message, RoomListItem } from "../chat/types";

function ChatInner() {
  const currentUserId = getUserId() || "";
  const userRole = getUserRole();
  const isOrgAdmin = userRole === "admin" || userRole === "super_admin";
  const qc = useQueryClient();
 const { activeRoomId, setActiveRoomId } = useChatContext();
  const [showDMModal, setShowDMModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editMsg, setEditMsg] = useState<Message | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const { ws, connState, realtimeMessages, roomReadAt, seedReadAt, markRoomOpened, activeGroupCalls, onlineUsers, typingUsers } = useChatContext();

  // Track active room in a ref so handleSelectRoom can mark the previous room without stale closures
  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  const p2p = useCallContext();

  // ── Data ──
  const {
    data: roomPages,
    isLoading: roomsLoading,
    hasNextPage: hasMoreRooms,
    isFetchingNextPage: loadingMoreRooms,
    fetchNextPage: fetchMoreRooms,
  } = useRooms();
  const rooms = useMemo(
    () => roomPages?.pages.flatMap((p) => p.rooms) ?? [],
    [roomPages]
  );
  const { data: msgData, isLoading: msgsLoading } = useMessages(activeRoomId || "");
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: members } = useRoomMembers(activeRoomId || "");
  const createDM = useCreateDM();
  const createGroup = useCreateGroup();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();

  // ── Seed read timestamps from fetched members ──
  useEffect(() => {
    if (!activeRoomId || !members?.length) return;
    const entries = members
      .filter((m) => m.user_id !== currentUserId && m.last_read_at)
      .map((m) => ({ userId: m.user_id, ts: new Date(m.last_read_at!).getTime() }));
    if (entries.length) seedReadAt(activeRoomId, entries);
  }, [activeRoomId, members, currentUserId, seedReadAt]);

  // ── Auto-send read receipt when new messages arrive in the active room ──
  const prevMsgCountRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!activeRoomId || !ws) return;
    const rtMsgs = realtimeMessages.get(activeRoomId);
    if (!rtMsgs?.length) return;
    const prevCount = prevMsgCountRef.current.get(activeRoomId) ?? 0;
    // Check if there are new messages from others
    if (rtMsgs.length > prevCount) {
      const hasNewFromOthers = rtMsgs.slice(prevCount).some((m) => m.sender_id !== currentUserId);
      if (hasNewFromOthers) {
        ws.sendReadReceipt(activeRoomId);
        markRoomOpened(activeRoomId);
      }
    }
    prevMsgCountRef.current.set(activeRoomId, rtMsgs.length);
  }, [activeRoomId, realtimeMessages, ws, currentUserId, markRoomOpened]);

  // ── Compute lowest read-at among other members (all others have read up to this point) ──
  const otherReadAtMs = useMemo(() => {
    if (!activeRoomId) return null;
    const roomReads = roomReadAt.get(activeRoomId);
    if (!roomReads?.size) return null;
    let min: number | null = null;
    for (const [uid, ts] of roomReads) {
      if (uid === currentUserId) continue;
      if (min === null || ts < min) min = ts;
    }
    return min;
  }, [activeRoomId, roomReadAt, currentUserId]);

  // ── Merge fetched + realtime messages ──
  const messages = useMemo(() => {
    const fetched = msgData?.messages ?? [];
    const realtime = activeRoomId ? realtimeMessages.get(activeRoomId) ?? [] : [];
    // Merge: fetched + realtime, dedupe by ID, sort by created_at
    const map = new Map<string, Message>();
    for (const m of fetched) map.set(m.id, m);
    for (const m of realtime) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [msgData, realtimeMessages, activeRoomId]);

  // ── Active room info ──
  const activeRoom: RoomListItem | undefined = rooms.find(
    (r) => r?.id === activeRoomId
  );
  const activeRoomName = activeRoom
    ? activeRoom.type === "dm"
      ? activeRoom.other_name || "Chat"
      : activeRoom.name || "Group"
    : "";

  // ── Handlers ──
  const handleSelectRoom = useCallback((id: string) => {
    // Mark the room we're leaving so messages seen while active don't count as unread
    const prev = activeRoomIdRef.current;
    if (prev && prev !== id) markRoomOpened(prev);
    setActiveRoomId(id);
    setReplyTo(null);
    setEditMsg(null);
    setMobileSidebar(false);
    setShowGroupInfo(false);
    markRoomOpened(id);
    ws?.sendReadReceipt(id);
    // Refresh room list after flusher processes the receipt
    setTimeout(() => qc.invalidateQueries({ queryKey: ["chat-rooms"] }), 3000);
  }, [ws, qc, markRoomOpened]);

  const handleNewDM = useCallback(
    async (userId: string) => {
      try {
        const room = await createDM.mutateAsync(userId);
        setShowDMModal(false);
        setActiveRoomId(room.id);
        setMobileSidebar(false);
      } catch (e: unknown) {
        toast.error((e as Error).message || "Failed to create DM");
      }
    },
    [createDM]
  );

  const handleNewGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      try {
        const room = await createGroup.mutateAsync({ name, member_ids: memberIds });
        setShowGroupModal(false);
        setActiveRoomId(room.id);
        setMobileSidebar(false);
      } catch (e: unknown) {
        toast.error((e as Error).message || "Failed to create group");
      }
    },
    [createGroup]
  );

  const handleEdit = useCallback(
    async (id: string, content: string) => {
      try {
        await editMessage.mutateAsync({ id, content });
      } catch (e: unknown) {
        toast.error((e as Error).message || "Failed to edit message");
      }
    },
    [editMessage]
  );

  const handleDelete = useCallback(
    async (msg: Message) => {
      try {
        await deleteMessage.mutateAsync(msg.id);
      } catch (e: unknown) {
        toast.error((e as Error).message || "Failed to delete message");
      }
    },
    [deleteMessage]
  );

  return (
    <div
      className="flex flex-col h-full"
    >
      {/* Connection status bar */}
      {connState !== "connected" && (
        <div
          className={`flex items-center justify-center gap-2 py-1.5 text-xs font-bold ${
            connState === "connecting"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {connState === "connecting" ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <WifiOff size={12} /> Disconnected — reconnecting…
            </>
          )}
        </div>
      )}

      {/* Main chat container */}
      <div className="flex-1 flex border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            mobileSidebar ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-80 lg:w-96 shrink-0`}
        >
          {roomsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-accent-start rounded-full animate-spin" />
            </div>
          ) : (
            <ChatSidebar
              rooms={rooms}
              activeRoomId={activeRoomId}
              onSelectRoom={handleSelectRoom}
              onNewChat={() => setShowDMModal(true)}
              onNewGroup={isOrgAdmin ? () => setShowGroupModal(true) : undefined}
              currentUserId={currentUserId}
              hasMore={!!hasMoreRooms}
              loadingMore={loadingMoreRooms}
              onLoadMore={() => fetchMoreRooms()}
              onCallPeer={p2p.state === "idle" ? (peerId, video) => p2p.call(peerId, video) : undefined}
            />
          )}
        </div>

        {/* Message area */}
        <div
          className={`${
            mobileSidebar ? "hidden" : "flex"
          } md:flex flex-1 flex-col min-w-0`}
        >
          {activeRoomId && activeRoom ? (
            <>
              {/* Room header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0a0a0f]/60">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobileSidebar(true)}
                  className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Room avatar */}
                <button
                  onClick={() => activeRoom.type === "group" && setShowGroupInfo((v) => !v)}
                  className={`shrink-0 ${
                    activeRoom.type === "group" ? "cursor-pointer" : ""
                  }`}
                >
                  {activeRoom.type === "dm" ? (
                    <Avatar name={activeRoomName} avatarKey={activeRoom.other_avatar_url} size="md" />
                  ) : activeRoom.avatar_url ? (
                    <Avatar name={activeRoomName} avatarKey={activeRoom.avatar_url} size="md" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-purple-500/15 text-purple-400">
                      <Users size={16} />
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    onClick={() => activeRoom.type === "group" && setShowGroupInfo((v) => !v)}
                    className={`text-sm font-bold text-white truncate ${
                      activeRoom.type === "group" ? "cursor-pointer hover:text-accent-start transition-colors" : ""
                    }`}
                  >
                    {activeRoomName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {connState === "connected" ? (
                      activeRoom.type === "group" ? (
                        typingUsers.get(activeRoomId!)?.size ? (
                          <span className="text-[10px] text-accent-start italic">typing…</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-start" />
                            {members?.filter((m) => m.status === "active").length ?? 0} members
                          </span>
                        )
                      ) : activeRoom.other_user_id && typingUsers.get(activeRoomId!)?.has(activeRoom.other_user_id) ? (
                        <span className="text-[10px] text-accent-start italic">typing…</span>
                      ) : activeRoom.other_user_id && onlineUsers.has(activeRoom.other_user_id) ? (
                        <span className="flex items-center gap-1 text-[10px] text-accent-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-start" />
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Offline</span>
                      )
                    ) : (
                      <span className="text-[10px] text-zinc-500">Offline</span>
                    )}
                  </div>
                </div>

                {/* Group call start button in header (only when no active call) */}
                {activeRoom.type === "group" && !activeGroupCalls.get(activeRoomId!) && isOrgAdmin && (
                  <GroupCallPanel
                    roomId={activeRoomId!}
                    roomType={activeRoom.type}
                    activeCall={undefined}
                    currentUserId={currentUserId}
                    canStartCall={isOrgAdmin}
                    isAdmin={members?.some(
                      (m) => m.user_id === currentUserId && m.role === "admin"
                    ) ?? false}
                    members={members ?? []}
                  />
                )}

                {/* 1:1 call buttons in DM header
                {activeRoom.type === "dm" && activeRoom.other_user_id && p2p.state === "idle" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => p2p.call(activeRoom.other_user_id!, false)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-accent-start hover:bg-accent-start/10 transition-colors"
                      title="Audio call"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => p2p.call(activeRoom.other_user_id!, true)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-accent-start hover:bg-accent-start/10 transition-colors"
                      title="Video call"
                    >
                      <Video size={16} />
                    </button>
                  </div>
                )} */}
              </div>

              {/* Group call panel (rendered outside header to avoid stretching it) */}
              {activeRoom.type === "group" && activeGroupCalls.get(activeRoomId!) && (
                <GroupCallPanel
                  roomId={activeRoomId!}
                  roomType={activeRoom.type}
                  activeCall={activeGroupCalls.get(activeRoomId!)}
                  currentUserId={currentUserId}
                  canStartCall={isOrgAdmin}
                  isAdmin={members?.some(
                    (m) => m.user_id === currentUserId && m.role === "admin"
                  ) ?? false}
                  members={members ?? []}
                />
              )}

              {/* Messages */}
              {msgsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-accent-start rounded-full animate-spin" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  otherReadAtMs={otherReadAtMs}
                  onEdit={(msg) => setEditMsg(msg)}
                  onDelete={handleDelete}
                  onReply={(msg) => setReplyTo(msg)}
                  isGroup={activeRoom?.type === "group"}
                />
              )}

              {/* Input */}
              <MessageInput
                roomId={activeRoomId}
                replyTo={replyTo}
                editMessage={editMsg}
                onCancelReply={() => setReplyTo(null)}
                onCancelEdit={() => setEditMsg(null)}
                onEditSubmit={handleEdit}
              />
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-5">
                <Users size={32} className="opacity-20" />
              </div>
              <h3 className="text-lg font-bold text-zinc-400 mb-1">
                Welcome to Chat
              </h3>
              <p className="text-sm text-zinc-600 text-center max-w-xs">
                Select a conversation or start a new one to begin messaging
              </p>
            </div>
          )}
        </div>

        {/* Group info panel */}
        {showGroupInfo && activeRoom?.type === "group" && (
          <GroupInfoPanel
            room={activeRoom}
            currentUserId={currentUserId}
            onClose={() => setShowGroupInfo(false)}
            onStartDM={(userId) => {
              setShowGroupInfo(false);
              handleNewDM(userId);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <NewDMModal
        open={showDMModal}
        onClose={() => setShowDMModal(false)}
        onSelect={handleNewDM}
        contacts={contacts}
        loading={contactsLoading}
      />
      <NewGroupModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreate={handleNewGroup}
        contacts={contacts}
        loading={contactsLoading}
      />

    </div>
  );
}

export default function ChatPage() {
  return <ChatInner />;
}
