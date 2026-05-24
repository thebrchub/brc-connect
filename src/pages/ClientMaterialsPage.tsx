import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  X,
  Share2,
  FileImage,
  CheckCircle2,
  Link as LinkIcon,
  MessageCircle,
  Mail,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

interface Material {
  id: string;
  title: string;
  description: string;
  type: string;
  size: string;
  src: string;
  filename: string;
  tags: string[];
  recommended?: boolean;
}

interface ShareTip {
  icon: LucideIcon;
  label: string;
  color: "emerald" | "blue" | "orange";
  tip: string;
}

interface QuickRule {
  ok: boolean;
  text: string;
}

const MATERIALS: Material[] = [
  {
    id: "flyer",
    title: "Company Flyer",
    description: "One-page overview of BRC HUB's services, ideal for sharing after a call.",
    type: "PNG Image",
    size: "1 Page",
    src: "/flyer.png",
    filename: "BRC_HUB_Flyer.png",
    tags: ["Share on WhatsApp", "Email Attachment", "First Intro"],
    recommended: true,
  },
];

const SHARE_TIPS: ShareTip[] = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    color: "emerald",
    tip: "Share right after a cold call. Say: 'Hi [Name] — dropping our company flyer as promised. Happy to walk you through anything specific.'",
  },
  {
    icon: Mail,
    label: "Email",
    color: "blue",
    tip: "Attach to a follow-up email. Subject: 'BRC HUB — Quick Overview as Discussed'. Keep the email body to 3 lines max.",
  },
  {
    icon: Smartphone,
    label: "In-Person",
    color: "orange",
    tip: "Open the flyer on your phone during a meeting. It works as a leave-behind — ask them to save it from your screen or AirDrop it.",
  },
];

const QUICK_RULES: QuickRule[] = [
  { ok: true, text: "Send after a call or meeting" },
  { ok: true, text: "Pair with a short personal message" },
  { ok: true, text: "Download then send — don't share raw link to unknown clients" },
  { ok: false, text: "Send as a cold opening message" },
  { ok: false, text: "Share without any context or intro" },
  { ok: false, text: "Use informal screenshots of the flyer" },
];

export default function ClientMaterialsPage() {
  const [previewItem, setPreviewItem] = useState<Material | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = (): void => {
    navigator.clipboard.writeText(`${window.location.origin}/flyer.png`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <div className="mb-8 relative z-10">
        
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
          Client Materials
        </h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-2xl leading-relaxed font-medium">
          Approved assets to share with prospects and clients. Download, forward on WhatsApp, or attach to emails — always use these over informal screenshots.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start relative z-10">

        {/* Materials Grid */}
        <div className="lg:col-span-2 space-y-6">

          <h2 className="text-[11px] font-extrabold uppercase tracking-[2px] text-zinc-500">
            Available Assets
          </h2>

          {MATERIALS.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]"
            >
              {item.recommended && (
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Recommended First Share
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-6">

                {/* Thumbnail - Enhanced physical card look */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="w-full sm:w-32 h-48 sm:h-40 bg-black rounded-2xl border border-white/10 overflow-hidden relative group cursor-pointer shrink-0 shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="p-3 rounded-full bg-black/50 backdrop-blur-md text-white shadow-xl">
                      <Eye size={20} />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                        <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                          <FileImage size={12} className="text-zinc-400" />
                          {item.type} <span className="w-1 h-1 rounded-full bg-zinc-600" /> {item.size}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-3">{item.description}</p>
                    
                    {/* Tags - Recessed pill style */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_2px_4px_rgba(0,0,0,0.5)] text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions - Skeuomorphic buttons */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <a
                      href={item.src}
                      download={item.filename}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-zinc-950 text-xs font-extrabold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_8px_rgba(249,115,22,0.3)] hover:scale-105 transition-all duration-200 group"
                    >
                      <Download size={14} className="group-hover:-translate-y-0.5 transition-transform drop-shadow-sm" />
                      Download File
                    </a>
                    
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.6)] hover:bg-[#121214] text-zinc-400 hover:text-white transition-all text-xs font-bold active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                    
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.6)] hover:bg-[#121214] text-zinc-400 hover:text-white transition-all text-xs font-bold active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon size={14} />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder for future assets - Deep recess */}
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#050505] p-8 flex flex-col items-center justify-center text-center gap-3 shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)]">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-1">
              <Share2 size={20} className="text-zinc-600" />
            </div>
            <p className="text-sm font-extrabold text-zinc-500">More assets coming soon</p>
            <p className="text-xs text-zinc-600 max-w-xs font-medium leading-relaxed">
              Brochures, case study PDFs, and proposal templates will appear here once approved.
            </p>
          </div>
        </div>

        {/* Sidebar: How to Share */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          <h2 className="text-[11px] font-extrabold uppercase tracking-[2px] text-zinc-500">
            How to Share
          </h2>

          {/* Tips Recessed Container */}
          <div className="bg-[#09090b] border border-white/5 rounded-3xl p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] space-y-1">
            {SHARE_TIPS.map((tip) => (
              <ShareTipCard key={tip.label} tip={tip} />
            ))}
          </div>

          {/* Golden Rule Card */}
          <div className="rounded-3xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-6 shadow-[inset_0_1px_1px_rgba(249,115,22,0.1),0_10px_20px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/20 blur-2xl rounded-full" />
            <p className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest mb-3 relative z-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Golden Rule
            </p>
            <p className="text-sm text-orange-200/90 leading-relaxed font-medium relative z-10">
              Always send the flyer <strong className="text-orange-400">after</strong> context — not as a cold first message. A flyer sent without conversation is just spam.
            </p>
          </div>

          {/* Quick Rules - Recessed Panel */}
          <div className="rounded-3xl bg-[#09090b] border border-white/5 p-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-4">Quick Rules</p>
            <ul className="space-y-3.5">
              {QUICK_RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  {r.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span className={`text-xs font-medium leading-relaxed ${r.ok ? "text-zinc-300" : "text-zinc-500"}`}>
                    {r.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Lightbox Portal */}
      {previewItem && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-10 animate-in fade-in duration-200"
          onClick={() => setPreviewItem(null)}
        >
          <button
            className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setPreviewItem(null)}
          >
            <X size={24} />
          </button>
          
          <div
            className="flex flex-col items-center gap-6 max-h-full animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewItem.src}
              alt={previewItem.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            
            <a
              href={previewItem.src}
              download={previewItem.filename}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-zinc-950 text-sm font-extrabold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_15px_rgba(249,115,22,0.4)] hover:scale-105 transition-all duration-200"
            >
              <Download size={16} className="drop-shadow-sm" />
              Download {previewItem.title}
            </a>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function ShareTipCard({ tip }: { tip: ShareTip }) {
  const colorMap: Record<ShareTip["color"], { icon: string; bg: string; border: string }> = {
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    blue: { icon: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    orange: { icon: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  };
  const c = colorMap[tip.color];

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-colors group cursor-default">
      <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] group-hover:scale-110 transition-transform duration-300`}>
        <tip.icon size={16} className={c.icon} />
      </div>
      <div>
        <p className={`text-xs font-extrabold mb-1.5 uppercase tracking-wider ${c.icon}`}>{tip.label}</p>
        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{tip.tip}</p>
      </div>
    </div>
  );
}