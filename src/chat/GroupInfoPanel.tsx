import { useState, useRef, useEffect } from "react";
import {
  X,
  Crown,
  Pencil,
  Check,
  UserMinus,
  UserPlus,
  LogOut,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  ShieldMinus,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import type { RoomMember, RoomListItem, ChatUser } from "./types";
import Avatar from "./Avatar";
import {
  useUpdateGroup,
  useRemoveMember,
  useLeaveGroup,
  useRoomMembers,
  useAddMembers,
  usePromoteMember,
  useDemoteMember,
  useContacts,
  useUploadGroupAvatar,
} from "./useChatApi";

interface Props {
  room: RoomListItem;
  currentUserId: string;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
}

export default function GroupInfoPanel({ room, currentUserId, onClose, onStartDM }: Props) {
  const { data: members = [], isLoading } = useRoomMembers(room.id);
  const { data: contacts = [] } = useContacts();
  const updateGroup = useUpdateGroup();
  const removeMember = useRemoveMember();
  const leaveGroup = useLeaveGroup();
  const addMembers = useAddMembers();
  const promoteMember = usePromoteMember();
  const demoteMember = useDemoteMember();
  const uploadGroupAvatar = useUploadGroupAvatar();

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(room.name || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const addSearchRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const myRole = members.find((m) => m.user_id === currentUserId)?.role;
  const isAdmin = myRole === "admin";

  // Sort: admins first, then alphabetical
  const sorted = [...members]
    .filter((m) => m.status === "active")
    .sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return (a.user_name || "").localeCompare(b.user_name || "");
    });

  // Contacts not already in the group
  const memberIds = new Set(members.filter((m) => m.status === "active").map((m) => m.user_id));
  const availableContacts = contacts.filter(
    (c) => !memberIds.has(c.id) && c.id !== currentUserId
  );
  const filteredContacts = availableContacts.filter((c) => {
    if (!addSearch) return true;
    const q = addSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (showAddMembers) addSearchRef.current?.focus();
  }, [showAddMembers]);

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === room.name) {
      setEditing(false);
      return;
    }
    try {
      await updateGroup.mutateAsync({ id: room.id, name: trimmed });
      setEditing(false);
      toast.success("Group renamed");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to rename");
    }
  };

  const handleRemove = async (member: RoomMember) => {
    if (!confirm(`Remove ${member.user_name || member.user_email}?`)) return;
    try {
      await removeMember.mutateAsync({ roomId: room.id, userId: member.user_id });
      toast.success("Member removed");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to remove");
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    try {
      await leaveGroup.mutateAsync(room.id);
      toast.success("Left group");
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to leave");
    }
  };

  const handleToggleRole = async (member: RoomMember) => {
    const action = member.role === "admin" ? "demote" : "promote";
    const label = member.user_name || member.user_email || "this member";
    if (!confirm(`${action === "promote" ? "Make" : "Remove"} ${label} as admin?`)) return;
    try {
      if (action === "promote") {
        await promoteMember.mutateAsync({ roomId: room.id, userId: member.user_id });
        toast.success(`${label} is now an admin`);
      } else {
        await demoteMember.mutateAsync({ roomId: room.id, userId: member.user_id });
        toast.success(`${label} is no longer an admin`);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || `Failed to ${action}`);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (selectedIds.size === 0) return;
    try {
      await addMembers.mutateAsync({ roomId: room.id, userIds: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""} added`);
      setSelectedIds(new Set());
      setAddSearch("");
      setShowAddMembers(false);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to add members");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadGroupAvatar.mutateAsync({ roomId: room.id, file });
      toast.success("Group avatar updated");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to upload avatar");
    }
    e.target.value = "";
  };

  return (
    <div className="w-64 border-l border-white/5 bg-[#0a0a0f]/80 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold text-white">Group Info</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Group avatar */}
      <div className="flex flex-col items-center py-4 border-b border-white/5">
        <div className="relative group">
          <Avatar name={room.name || "Group"} avatarKey={room.avatar_url} size="lg" />
          {isAdmin && (
            <>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {uploadGroupAvatar.isPending ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>
      </div>

      {/* Group name */}
      <div className="px-4 py-3 border-b border-white/5">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setEditing(false); setNewName(room.name || ""); }
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-accent-start/50"
              maxLength={100}
            />
            <button
              onClick={handleRename}
              disabled={updateGroup.isPending}
              className="p-1 rounded text-accent-start hover:bg-accent-start/10 transition-colors"
            >
              {updateGroup.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate flex-1">
              {room.name || "Group"}
            </span>
            {isAdmin && (
              <button
                onClick={() => { setNewName(room.name || ""); setEditing(true); }}
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                title="Rename group"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members header + Add button */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          Members · {sorted.length}
        </span>
        {isAdmin && (
          <button
            onClick={() => setShowAddMembers((v) => !v)}
            className="p-1 rounded text-zinc-500 hover:text-accent-start hover:bg-accent-start/10 transition-colors"
            title="Add members"
          >
            <UserPlus size={14} />
          </button>
        )}
      </div>

      {/* Add members panel (inline) */}
      {showAddMembers && (
        <div className="px-3 pb-2 border-b border-white/5">
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              ref={addSearchRef}
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white outline-none focus:border-accent-start/50 placeholder:text-zinc-600"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {filteredContacts.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-2">No users to add</p>
            ) : (
              filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleSelected(c.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    selectedIds.has(c.id)
                      ? "bg-accent-start border-accent-start"
                      : "border-zinc-600"
                  }`}>
                    {selectedIds.has(c.id) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-xs text-white truncate">{c.name}</span>
                  <span className="text-[10px] text-zinc-600 truncate ml-auto">{c.email}</span>
                </button>
              ))
            )}
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleAddMembers}
              disabled={addMembers.isPending}
              className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium bg-accent-start/15 text-accent-start hover:bg-accent-start/25 transition-colors"
            >
              {addMembers.isPending ? (
                <Loader2 size={12} className="animate-spin mx-auto" />
              ) : (
                `Add ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}`
              )}
            </button>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-zinc-500" />
          </div>
        ) : (
          sorted.map((m) => (
            <div
              key={m.user_id}
              className={`flex items-center gap-2.5 px-4 py-2 hover:bg-white/[0.03] group ${
                m.user_id !== currentUserId && onStartDM ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (m.user_id !== currentUserId && onStartDM) onStartDM(m.user_id);
              }}
            >
              {/* Avatar */}
              <Avatar
                name={m.user_name || m.user_email}
                avatarKey={m.user_avatar_url}
                size="sm"
                className={m.role === "admin" ? "ring-1 ring-amber-400/30" : ""}
              />

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-white truncate">
                    {m.user_name || m.user_email || m.user_id.slice(0, 8)}
                  </span>
                  {m.user_id === currentUserId && (
                    <span className="text-[10px] text-zinc-500">You</span>
                  )}
                </div>
                {m.role === "admin" && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400/80">
                    <Crown size={9} /> Admin
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5">
                {m.user_id !== currentUserId && onStartDM && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onStartDM(m.user_id); }}
                    className="p-1 rounded text-zinc-600 hover:text-accent-start hover:bg-accent-start/10 opacity-0 group-hover:opacity-100 transition-all"
                    title={`Message ${m.user_name || "user"}`}
                  >
                    <MessageCircle size={13} />
                  </button>
                )}
                {isAdmin && m.user_id !== currentUserId && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleRole(m); }}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${
                        m.role === "admin"
                          ? "text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10"
                          : "text-zinc-600 hover:text-amber-400 hover:bg-amber-400/10"
                      }`}
                      title={m.role === "admin" ? "Remove admin" : "Make admin"}
                    >
                      {m.role === "admin" ? <ShieldMinus size={13} /> : <ShieldCheck size={13} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(m); }}
                      className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove member"
                    >
                      <UserMinus size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Leave button */}
      <div className="px-4 py-3 border-t border-white/5">
        <button
          onClick={handleLeave}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={14} /> Leave Group
        </button>
      </div>
    </div>
  );
}
