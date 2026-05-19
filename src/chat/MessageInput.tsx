import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Reply, Paperclip, Image, FileText, Loader2 } from "lucide-react";
import type { Message } from "./types";
import { useChatContext } from "./ChatContext";
import { uploadChatFile } from "./useChatApi";

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
  const [pendingFile, setPendingFile] = useState<{ file: File; preview?: string } | null>(null);
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

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    };
  }, [pendingFile]);

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

      {/* File preview bar */}
      {pendingFile && (
        <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border-b border-white/5">
          {pendingFile.preview ? (
            <img src={pendingFile.preview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <FileText size={16} className="text-zinc-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{pendingFile.file.name}</p>
            <p className="text-[10px] text-zinc-500">
              {(pendingFile.file.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            onClick={clearPendingFile}
            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
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
