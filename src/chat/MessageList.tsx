import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Check, CheckCheck, Pencil, Trash2, Reply, Download, FileText, X, AlertTriangle, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Message } from "./types";
import { useChatFileUrl } from "./useChatApi";
import Avatar from "./Avatar";

interface Props {
  messages: Message[];
  currentUserId: string;
  /** Earliest read-at timestamp (ms) among other room members. Null if unknown. */
  otherReadAtMs: number | null;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  isGroup?: boolean;
  highlightedMessageId?: string | null;
  highlightRequestKey?: number;
  /** Lookup map: userId -> { name, avatar_url } for resolving sender info on realtime messages */
  memberMap?: Map<string, { name: string; avatar_url: string }>;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function MessageList({
  messages,
  currentUserId,
  otherReadAtMs,
  onEdit,
  onDelete,
  onReply,
  onLoadMore,
  hasMore,
  loadingMore,
  isGroup,
  highlightedMessageId,
  highlightRequestKey,
  memberMap,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<number | null>(null);
  const handledHighlightRequestRef = useRef<number | null>(null);
  const isAwayFromBottomRef = useRef(false);

  // Custom Delete Modal State
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      const lastMsg = messages[messages.length - 1];
      // Always scroll if the new message is from the current user (they just sent it)
      // or if the user is already near the bottom
      if (!isAwayFromBottomRef.current || lastMsg?.sender_id === currentUserId) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length, messages, currentUserId]);

  const setMessageRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      messageRefs.current.set(id, node);
    } else {
      messageRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    if (!highlightedMessageId) {
      handledHighlightRequestRef.current = null;
      highlightTimeoutRef.current = window.setTimeout(() => {
        setActiveHighlightId(null);
        highlightTimeoutRef.current = null;
      }, 0);
      return;
    }

    const requestKey = highlightRequestKey ?? 0;
    if (handledHighlightRequestRef.current === requestKey) return;

    const target = messageRefs.current.get(highlightedMessageId);
    if (!target) return;

    handledHighlightRequestRef.current = requestKey;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    highlightTimeoutRef.current = window.setTimeout(() => {
      setActiveHighlightId(highlightedMessageId);
      highlightTimeoutRef.current = window.setTimeout(() => {
        setActiveHighlightId(null);
        highlightTimeoutRef.current = null;
      }, 2600);
    }, 0);
  }, [highlightedMessageId, highlightRequestKey, messages]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Group messages by date
  const grouped = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: msg.created_at, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  // Infinite scroll: load more when scrolled to top
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAwayFromBottom = distanceFromBottom > 180;
    isAwayFromBottomRef.current = isAwayFromBottom;
    setShowScrollDown((prev) => (prev === isAwayFromBottom ? prev : isAwayFromBottom));

    if (hasMore && !loadingMore && el.scrollTop < 60) {
      onLoadMore?.();
    }
  };

  const scrollToBottom = () => {
    isAwayFromBottomRef.current = false;
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = useCallback((messageId: string) => {
    const target = messageRefs.current.get(messageId);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    setActiveHighlightId(messageId);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setActiveHighlightId(null);
      highlightTimeoutRef.current = null;
    }, 2000);
  }, []);

  // Find reply target
  const msgMap = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
        <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4">
          <Check size={24} className="opacity-30" />
        </div>
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs text-zinc-600 mt-1">Send a message to start the conversation</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-3 space-y-1"
        >
          {/* Load more indicator */}
          {loadingMore && (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-accent-start rounded-full animate-spin" />
            </div>
          )}
          {hasMore && !loadingMore && (
            <button
              onClick={onLoadMore}
              className="w-full text-center py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Load earlier messages
            </button>
          )}

          {grouped.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {formatDateGroup(group.date)}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              const isDeleted = !!msg.deleted_at;
              const prevMsg = i > 0 ? group.messages[i - 1] : null;
              const showSender = !isMine && msg.sender_id !== prevMsg?.sender_id;
              const replyTarget = msg.reply_to ? msgMap.get(msg.reply_to) : null;
              const isHighlighted = activeHighlightId === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  ref={(node) => setMessageRef(msg.id, node)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} group ${
                    showSender ? "mt-3" : "mt-0.5"
                  }`}
                >
                  {/* Sender avatar (group only, other's messages) */}
                  {isGroup && !isMine && (() => {
                    const senderName = msg.sender_name || memberMap?.get(msg.sender_id)?.name || "?";
                    const senderAvatar = msg.sender_avatar_url || memberMap?.get(msg.sender_id)?.avatar_url;
                    return (
                      <div className="w-7 shrink-0 mr-2 self-end">
                        {showSender && (
                          <Avatar name={senderName} avatarKey={senderAvatar} size="sm" className="w-7 h-7 text-[10px]" />
                        )}
                      </div>
                    );
                  })()}
                  <div className={`relative max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                    {/* Sender name */}
                    {showSender && (msg.sender_name || memberMap?.get(msg.sender_id)?.name) && (
                      <p className="text-[10px] text-zinc-500 font-bold mb-1 ml-1">
                        {msg.sender_name || memberMap?.get(msg.sender_id)?.name}
                      </p>
                    )}

                    {/* Reply preview */}
                    {replyTarget && (
                      <div
                        onClick={() => scrollToMessage(replyTarget.id)}
                        className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 text-[11px] cursor-pointer hover:brightness-125 transition-all ${
                          isMine
                            ? "bg-white/[0.03] border-accent-start/40 text-zinc-400"
                            : "bg-white/[0.02] border-zinc-500/40 text-zinc-400"
                        }`}
                      >
                        <span className="font-semibold text-zinc-300">
                          {replyTarget.sender_name || "Unknown"}
                        </span>
                        <p className="truncate mt-0.5">
                          {replyTarget.deleted_at ? "Message deleted" : replyTarget.content}
                        </p>
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        isDeleted
                          ? "bg-white/[0.02] text-zinc-600 italic border border-white/5"
                          : isMine
                            ? "bg-accent-start/15 text-white border border-accent-start/10"
                            : "bg-white/[0.05] text-zinc-200 border border-white/5"
                      } ${
                        isHighlighted
                          ? "ring-2 ring-accent-start/70 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
                          : "ring-0"
                      } transition-[box-shadow,ring-color] duration-300`}
                    >
                      {isDeleted ? (
                        <span className="text-xs">This message was deleted</span>
                      ) : (
                        <>
                          {msg.media_url && (() => {
                            const [fn, ...rest] = (msg.content || "").split("\n");
                            const caption = rest.join("\n");
                            return (
                              <>
                                <MediaPreview url={msg.media_url} type={msg.media_type} fileName={fn} />
                                {caption && <p className="whitespace-pre-wrap break-words text-sm mt-1">{caption}</p>}
                              </>
                            );
                          })()}
                          {msg.content && !msg.media_url && (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                        </>
                      )}
                      <div
                        className={`flex items-center gap-1.5 mt-1 ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span className="text-[10px] text-zinc-600">
                          {formatTime(msg.created_at)}
                        </span>
                        {msg.edited_at && !isDeleted && (
                          <span className="text-[10px] text-zinc-600">edited</span>
                        )}
                        {isMine && !isDeleted && (() => {
                          const msgTs = new Date(msg.created_at).getTime();
                          const isRead = otherReadAtMs != null && otherReadAtMs >= msgTs;
                          return isRead
                            ? <CheckCheck size={12} className="text-blue-400" />
                            : <Check size={12} className="text-zinc-500" />;
                        })()}
                      </div>
                    </div>

                    {/* Action buttons (visible on hover) */}
                    {!isDeleted && (
                      <div
                        className={`absolute top-0 ${
                          isMine ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
                        } hidden group-hover:flex items-center gap-0.5 z-10`}
                      >
                        <button
                          onClick={() => onReply(msg)}
                          className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                          title="Reply"
                        >
                          <Reply size={13} />
                        </button>
                        {isMine && (
                          <>
                            <button
                              onClick={() => onEdit(msg)}
                              className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              // OPEN CUSTOM MODAL INSTEAD OF DIRECT DELETE
                              onClick={() => setMsgToDelete(msg)}
                              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
          <div ref={bottomRef} />
        </div>

        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-[#18181b] border border-white/10 text-white shadow-xl shadow-black/30 flex items-center justify-center hover:bg-zinc-800 hover:border-accent-start/40 transition-all"
            title="Go to latest messages"
            aria-label="Go to latest messages"
          >
            <ChevronDown size={20} />
          </button>
        )}
      </div>

      {/* ── Custom Delete Confirmation Modal ── */}
      {msgToDelete && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-400">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Message?</h3>
            </div>
            
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              Are you sure you want to delete this message? This action will permanently remove it from <strong className="text-white">both sides</strong> of the conversation and cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setMsgToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(msgToDelete);
                  setMsgToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-[0_4px_10px_rgba(239,68,68,0.3)]"
              >
                Delete for Everyone
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Lightbox overlay ──
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt="preview"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

// ── Media preview component ──
function MediaPreview({ url, type, fileName }: { url: string; type?: string; fileName?: string }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const { data: resolvedUrl } = useChatFileUrl(url);
  const src = resolvedUrl || url;

  if (type === "image" || type?.startsWith("image")) {
    return (
      <div className="mb-1 relative">
        {!imgLoaded && !imgError && (
          <div className="w-64 h-48 rounded-lg bg-white/5 animate-pulse" />
        )}
        {!imgError ? (
          <>
            <img
              src={src}
              alt="attachment"
              className={`max-w-full max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                imgLoaded ? "" : "hidden"
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              onClick={() => setLightbox(true)}
            />
            {lightbox && <ImageLightbox src={src} onClose={() => setLightbox(false)} />}
          </>
        ) : (
          <FileDownloadCard url={src} name={fileName} />
        )}
      </div>
    );
  }

  if (type === "video" || type?.startsWith("video")) {
    return (
      <div className="mb-1">
        <video
          src={src}
          controls
          preload="metadata"
          className="max-w-full max-h-96 rounded-lg"
        />
      </div>
    );
  }

  if (type === "audio" || type?.startsWith("audio")) {
    return (
      <div className="mb-1">
        <audio src={src} controls preload="metadata" className="w-full max-w-[280px]" />
      </div>
    );
  }

  return <FileDownloadCard url={src} name={fileName} />;
}

function FileDownloadCard({ url, name }: { url: string; name?: string }) {
  const fileName = name || url.split("/").pop()?.split("?")[0] || "Download";
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };
  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors w-full text-left"
    >
      <FileText size={16} className="text-zinc-400 shrink-0" />
      <span className="text-xs text-accent-start truncate flex-1">{fileName}</span>
      <Download size={14} className="text-zinc-500 shrink-0" />
    </button>
  );
}
