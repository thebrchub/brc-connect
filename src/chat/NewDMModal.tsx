import { useState, useMemo } from "react";
import { X, MessageCircle, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatUser } from "./types";
import Avatar from "./Avatar";
import { useSearchContacts } from "./useChatApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  contacts: ChatUser[];
  loading?: boolean;
}

export default function NewDMModal({ open, onClose, onSelect, contacts, loading }: Props) {
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");

  // Local filter on pre-loaded contacts (own employees)
  const localFiltered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  // Remote search across entire org (fires only after Enter with 2+ chars)
  const { data: remoteResults, isLoading: searchLoading } = useSearchContacts(committedSearch);

  // Merge: local contacts + remote results, deduplicate by id
  const displayList = useMemo(() => {
    if (!committedSearch || committedSearch.length < 2) return localFiltered;
    const map = new Map<string, ChatUser>();
    for (const c of localFiltered) map.set(c.id, c);
    if (remoteResults) {
      for (const c of remoteResults) {
        if (!map.has(c.id)) map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }, [localFiltered, remoteResults, committedSearch]);

  const isLoading = loading || (committedSearch.length >= 2 && searchLoading);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
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
                <MessageCircle size={18} className="text-accent-start" />
                <h3 className="text-lg font-bold text-white">New Message</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search.trim().length >= 2) {
                      setCommittedSearch(search.trim());
                    }
                  }}
                  placeholder="Search by name or email… (press Enter)"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent-start/40 transition-colors"
                />
              </div>
              {committedSearch.length >= 2 && (
                <p className="text-[10px] text-zinc-600 mt-1 px-1">
                  Showing results for "{committedSearch}" across your organization
                </p>
              )}
            </div>

            {/* Contact list */}
            <div className="max-h-72 overflow-y-auto px-3 pb-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-zinc-500" />
                </div>
              ) : displayList.length === 0 ? (
                <p className="text-center text-zinc-500 text-sm py-8">
                  {search.trim().length >= 2
                    ? "No users found in your organization"
                    : "No contacts found"}
                </p>
              ) : (
                displayList.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => onSelect(user.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <Avatar name={user.name} avatarKey={user.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                      {user.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
