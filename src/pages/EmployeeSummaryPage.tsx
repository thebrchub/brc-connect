import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";

interface PeriodSummary {
  period_start: string;
  total_leads: number;
  contacted: number;
  conversions: number;
  follow_ups: number;
  revisit_later: number;
  not_interested: number;
  closed: number;
  contact_rate: number;
  conversion_rate: number;
}

interface SummaryResponse {
  employee_id: string;
  employee_name: string;
  period: string;
  summaries: PeriodSummary[];
}

const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

function formatPeriodLabel(dateStr: string, period: string): string {
  const d = new Date(dateStr);
  switch (period) {
    case "daily":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    case "weekly":
      return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    case "monthly":
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "yearly":
      return d.getFullYear().toString();
    default:
      return dateStr;
  }
}

export default function EmployeeSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState<string>("weekly");
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    api
      .get(`/crm/employees/${id}/summary?period=${period}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [id, period]);

  if (loading) return <Spinner />;
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          to={`/crm/employees/${id}`}
          className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{data?.employee_name || "Employee"}</h1>
          <p className="text-zinc-400 text-sm mt-1.5">Performance summary</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              period === p
                ? "bg-gradient-to-r from-accent-start to-accent-end text-zinc-950 shadow-[0_4px_12px_rgba(52,211,153,0.3)]"
                : "bg-[#09090b] border border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Table */}
      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/30">
              <tr className="border-b border-white/5 text-zinc-400 text-left">
                <th className="px-6 py-4 font-medium"><Calendar size={14} className="inline mr-1.5" />Period</th>
                <th className="px-4 py-4 font-medium text-center">Total</th>
                <th className="px-4 py-4 font-medium text-center">Contacted</th>
                <th className="px-4 py-4 font-medium text-center">Conversions</th>
                <th className="px-4 py-4 font-medium text-center">Follow-ups</th>
                <th className="px-4 py-4 font-medium text-center">Revisit</th>
                <th className="px-4 py-4 font-medium text-center">Not Interested</th>
                <th className="px-4 py-4 font-medium text-center">Closed</th>
                <th className="px-4 py-4 font-medium text-center"><TrendingUp size={14} className="inline mr-1" />Contact %</th>
                <th className="px-4 py-4 font-medium text-center">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {data?.summaries && data.summaries.length > 0 ? (
                data.summaries.map((row) => (
                  <tr key={row.period_start} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-zinc-300 font-medium whitespace-nowrap">
                      {formatPeriodLabel(row.period_start, period)}
                    </td>
                    <td className="px-4 py-4 text-center text-zinc-300">{row.total_leads}</td>
                    <td className="px-4 py-4 text-center text-cyan-400">{row.contacted}</td>
                    <td className="px-4 py-4 text-center text-emerald-400">{row.conversions}</td>
                    <td className="px-4 py-4 text-center text-orange-400">{row.follow_ups}</td>
                    <td className="px-4 py-4 text-center text-amber-400">{row.revisit_later}</td>
                    <td className="px-4 py-4 text-center text-red-400">{row.not_interested}</td>
                    <td className="px-4 py-4 text-center text-zinc-500">{row.closed}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${Math.min(row.contact_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">{row.contact_rate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs text-emerald-400 font-bold">{row.conversion_rate.toFixed(0)}%</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-zinc-500">
                    No data available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
