import { useState } from "react";
import { X, Users, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatUser } from "./types";
import Avatar from "./Avatar";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
  contacts: ChatUser[];
  loading?: boolean;
}

export default function NewGroupModal({ open, onClose, onCreate, contacts, loading }: Props) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!name.trim() || selected.size === 0) return;
    onCreate(name.trim(), Array.from(selected));
    setName("");
    setSearch("");
    setSelected(new Set());
  };

  const handleClose = () => {
    setName("");
    setSearch("");
    setSelected(new Set());
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                <h3 className="text-lg font-bold text-white">New Group</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Group name */}
            <div className="px-6 pt-4 pb-2">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                Group Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Team"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-400/40 transition-colors"
              />
            </div>

            {/* Search */}
            <div className="px-6 py-2">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                Add Members {selected.size > 0 && `(${selected.size})`}
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-400/40 transition-colors"
                />
              </div>
            </div>

            {/* Selected chips */}
            {selected.size > 0 && (
              <div className="px-6 py-1 flex flex-wrap gap-1.5">
                {Array.from(selected).map((id) => {
                  const user = contacts.find((c) => c.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium"
                    >
                      {user?.name || id}
                      <button onClick={() => toggle(id)} className="hover:text-white">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Contact list */}
            <div className="max-h-56 overflow-y-auto px-3 py-2">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-purple-400 rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-6">No contacts found</p>
              ) : (
                filtered.map((user) => {
                  const isSelected = selected.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggle(user.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                        isSelected ? "bg-purple-500/10" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <Avatar
                        name={user.name}
                        avatarKey={user.avatar_url}
                        size="md"
                        className={isSelected ? "ring-2 ring-purple-400" : ""}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-purple-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || selected.size === 0}
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
              >
                Create Group
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
