interface Props {
  status: string;
}

// Added subtle borders and updated opacity levels for a premium glass look
const COLORS: Record<string, string> = {
  new: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  contacted: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  qualified: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  follow_up: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  revisit_later: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  converted: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  not_interested: "bg-red-500/10 border-red-500/20 text-red-400",
  closed: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
  pending: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
  running: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/10 border-red-500/20 text-red-400",
  dead: "bg-red-500/10 border-red-500/20 text-red-400",
  active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

export default function StatusBadge({ status }: Props) {
  const safeStatus = (status || "unknown").toLowerCase();
  const style = COLORS[safeStatus] || "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm ${style}`}
    >
      {safeStatus.replace(/_/g, " ")}
    </span>
  );
}