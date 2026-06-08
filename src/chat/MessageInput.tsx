import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Send, X, Reply, Paperclip, Image, FileText, Loader2, ExternalLink } from "lucide-react";
import type { Message } from "./types";
import { useChatContext } from "./ChatContext";
import { uploadChatFile } from "./useChatApi";
import { extractFirstUrl, fetchLinkPreview, type LinkPreviewData } from "./linkPreview";

interface Props {
  roomId: string;
  replyTo: Message | null;
  editMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onEditSubmit: (id: string, content: string) => void;
}

export default function MessageInput({
  roomId,
  replyTo,
  editMessage,
  onCancelReply,
  onCancelEdit,
  onEditSubmit,
}: Props) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; preview?: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ file: File; preview?: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, sendTyping } = useChatContext();
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when room changes or reply/edit starts
  useEffect(() => {
    inputRef.current?.focus();
    if (editMessage) {
      setText(editMessage.content || "");
    }
  }, [roomId, replyTo, editMessage]);

  useEffect(() => {
    const url = extractFirstUrl(text);
    if (!url) {
      setLinkPreview(null);
      return;
    }

    let cancelled = false;
    fetchLinkPreview(url).then((preview) => {
      if (!cancelled) setLinkPreview(preview);
    });

    return () => {
      cancelled = true;
    };
  }, [text]);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    };
  }, [pendingFile]);

  useEffect(() => {
    if (!previewModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewModal]);

  const handleTyping = useCallback(() => {
    if (typingTimeout.current) return;
    sendTyping(roomId);
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null;
    }, 2000);
  }, [roomId, sendTyping]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";

    // 25 MB limit
    if (file.size > 25 * 1024 * 1024) {
      alert("File too large (max 25MB)");
      return;
    }

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    setPendingFile({ file, preview });
    inputRef.current?.focus();
  };

  const clearPendingFile = () => {
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    setPendingFile(null);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;
    if (uploading) return;

    if (editMessage) {
      onEditSubmit(editMessage.id, trimmed);
      setText("");
      onCancelEdit();
      return;
    }

    // If there's a file, upload it first
    if (pendingFile) {
      setUploading(true);
      try {
        const { fileUrl, mediaType } = await uploadChatFile(pendingFile.file);
        const content = trimmed ? pendingFile.file.name + "\n" + trimmed : pendingFile.file.name;
        sendMessage(roomId, content, replyTo?.id, fileUrl, mediaType);
        clearPendingFile();
        setText("");
        if (replyTo) onCancelReply();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
      return;
    }

    sendMessage(roomId, trimmed, replyTo?.id);
    setText("");
    if (replyTo) onCancelReply();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) return;
        const ext = item.type.split("/")[1] || "png";
        const file = new File([blob], `screenshot-${Date.now()}.${ext}`, { type: item.type });
        const preview = URL.createObjectURL(file);
        if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
        setPendingFile({ file, preview });
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (pendingFile) clearPendingFile();
      else if (editMessage) onCancelEdit();
      else if (replyTo) onCancelReply();
    }
  };

  return (
    <div className="border-t border-white/5 bg-[#0a0a0f]">
      {/* Reply / Edit preview bar */}
      {(replyTo || editMessage) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border-b border-white/5">
          <Reply size={14} className="text-accent-start shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-accent-start font-bold uppercase tracking-wider">
              {editMessage ? "Editing message" : `Reply to ${replyTo?.sender_name || "message"}`}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {editMessage?.content || replyTo?.content}
            </p>
          </div>
          <button
            onClick={editMessage ? onCancelEdit : onCancelReply}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Link preview card */}
      {linkPreview && !pendingFile && (
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <a
            href={linkPreview.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#111116] p-3 hover:bg-white/[0.04] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="mt-1 text-sm font-semibold text-white line-clamp-2">{linkPreview.title}</p>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{linkPreview.description}</p>
              <p className="mt-2 text-[11px] text-zinc-500 break-all">{linkPreview.url}</p>
            </div>
            <ExternalLink size={14} className="text-zinc-500 mt-0.5" />
          </a>
        </div>
      )}

      {/* File preview card */}
      {pendingFile && (
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="rounded-2xl border border-white/10 bg-[#111116] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setPreviewModal(pendingFile)}
                className="shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 hover:opacity-90 transition-opacity"
              >
                {pendingFile.preview ? (
                  <img src={pendingFile.preview} alt="Selected attachment" className="h-16 w-16 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center bg-white/5">
                    <FileText size={20} className="text-zinc-400" />
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{pendingFile.file.name}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{(pendingFile.file.size / 1024).toFixed(0)} KB · Tap to preview</p>
                <p className="mt-1 text-[11px] text-accent-start">Will be sent as an attachment</p>
              </div>
              <button
                type="button"
                onClick={clearPendingFile}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {previewModal && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewModal(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewModal(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
          <div
            className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#09090b] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewModal.preview ? (
              <img
                src={previewModal.preview}
                alt="Attachment preview"
                className="mx-auto max-h-[75vh] w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
                <FileText size={28} className="text-zinc-400" />
                <p className="mt-3 text-base font-semibold text-white">{previewModal.file.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{(previewModal.file.size / 1024).toFixed(0)} KB</p>
              </div>
            )}
            <p className="mt-4 text-sm text-zinc-300">{previewModal.file.name}</p>
          </div>
        </div>,
        document.body
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* File picker (hidden when editing) */}
        {!editMessage && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-10 h-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-30 flex items-center justify-center transition-colors"
              title="Attach file"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : pendingFile?.file.type.startsWith("image/") ? (
                <Image size={16} />
              ) : (
                <Paperclip size={16} />
              )}
            </button>
          </>
        )}

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={pendingFile ? "Add a caption…" : "Type a message…"}
          rows={1}
          className="flex-1 resize-none bg-zinc-900 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent-start/30 transition-colors max-h-32 leading-relaxed"
          style={{
            height: "auto",
            minHeight: "40px",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 128) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !pendingFile) || uploading}
          className="shrink-0 w-10 h-10 rounded-xl bg-accent-start/20 text-accent-start hover:bg-accent-start/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
