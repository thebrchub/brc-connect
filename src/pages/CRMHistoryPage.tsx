import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api/client";
import type { LeadActivity, PaginatedResponse } from "../types";
import Spinner from "../components/Spinner";
import { Phone, Mail, Globe, ExternalLink, ChevronDown, MapPin, Tag, ShieldCheck, Smartphone, Search, X } from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  contacted: "bg-blue-500/20 text-blue-400",
  follow_up: "bg-purple-500/20 text-purple-400",
  revisit_later: "bg-amber-500/20 text-amber-400",
  interested: "bg-green-500/20 text-green-400",
  converted: "bg-emerald-500/20 text-emerald-400",
  not_interested: "bg-red-500/20 text-red-400",
  closed: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "revisit_later", label: "Revisit Later" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "closed", label: "Closed" },
];

export default function CRMHistoryPage() {
  const [leads, setLeads] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Smart local search state (persists across page changes)
  const [searchTerm, setSearchTerm] = useState("");
  // Status filter
  const [statusFilter, setStatusFilter] = useState("");

  const fetchHistory = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: "20" });
    if (statusFilter) params.set("status", statusFilter);
    api.get<PaginatedResponse<LeadActivity>>(`/crm/leads/history?${params}`)
      .then((res) => {
        setLeads(res.data || []);
        setTotal(res.meta.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function updateActivity(activityId: string, updates: Record<string, string | null>) {
    setUpdating(activityId);
    try {
      await api.patch(`/crm/leads/${activityId}`, updates);
      toast.success("Activity updated successfully");
      fetchHistory();
      setExpandedId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update activity");
    } finally {
      setUpdating(null);
    }
  }

  // Filter current page's leads based on persistent search term
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const lowerTerm = searchTerm.toLowerCase();
    return leads.filter((lead) => 
      lead.business_name?.toLowerCase().includes(lowerTerm) ||
      lead.email?.toLowerCase().includes(lowerTerm) ||
      lead.phone_e164?.includes(searchTerm) ||
      lead.city?.toLowerCase().includes(lowerTerm)
    );
  }, [leads, searchTerm]);

  if (loading && leads.length === 0) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">{error}</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">History</h1>
          <p className="text-zinc-400 text-sm mt-1.5">Leads you've interected with ({total} total)</p>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            options={STATUS_FILTER_OPTIONS}
          />

          {/* Local Page Search Input */}
          <div className="relative w-full sm:w-72 group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="Filter current page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 hover:border-white/20 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all shadow-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm table-fixed">
  <thead className="bg-black/30">
    <tr className="border-b border-white/5 text-zinc-400 text-left">
      {/* Explicit widths prevent the auto-layout from resizing the header when rows expand */}
      <th className="px-6 py-4 font-medium w-12"></th>
      <th className="px-6 py-4 font-medium w-[20%]">Business</th>
      <th className="px-6 py-4 font-medium w-[15%]">Phone</th>
      <th className="px-6 py-4 font-medium w-[20%]">Email</th>
      <th className="px-6 py-4 font-medium w-[12%]">City</th>
      <th className="px-6 py-4 font-medium w-[10%]">Status</th>
      <th className="px-6 py-4 font-medium w-[12%]">Last Contact</th>
      <th className="px-6 py-4 font-medium w-[15%]">Next Follow Up</th>
    </tr>
  </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <HistoryRow
                  key={lead.activity_id}
                  lead={lead}
                  expanded={expandedId === lead.activity_id}
                  onToggle={() => setExpandedId(expandedId === lead.activity_id ? null : lead.activity_id)}
                  onUpdate={updateActivity}
                  updating={updating === lead.activity_id}
                />
              ))}
              
              {/* Empty state when there's absolutely no history */}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-zinc-500">
                    No history yet. Start contacting your assigned leads!
                  </td>
                </tr>
              )}

              {/* Smart empty state when local filter yields 0 results on THIS page */}
              {leads.length > 0 && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Search size={28} className="text-zinc-600" />
                      <div>
                        <p className="text-zinc-400 font-medium">No matches found on Page {page}</p>
                        <p className="text-zinc-500 text-xs mt-1">
                          Try checking the next page or clear your filter.
                        </p>
                      </div>
                      {page < totalPages && (
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                          Check Page {page + 1}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ... (HistoryRow component remains completely unchanged, keep your existing code for that section)

interface HistoryRowProps {
  lead: LeadActivity;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Record<string, string | null>) => void;
  updating: boolean;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "revisit_later", label: "Revisit Later" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "closed", label: "Closed" },
];

function HistoryRow({ lead, expanded, onToggle, onUpdate, updating }: HistoryRowProps) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [nextAction, setNextAction] = useState(lead.next_action || "");
  const [nextFollowUp, setNextFollowUp] = useState(lead.next_follow_up?.slice(0, 16) || "");

  return (
    <>
      {/* 
        Modified border behavior: Removes bottom border when expanded 
        so it seamlessly blends into the expanded content container below it.
      */}
      <tr
        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
          expanded ? "bg-white/[0.02] border-transparent" : "border-b border-white/5"
        }`}
        onClick={onToggle}
      >
        <td className="px-6 py-4">
          <div className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
            <ChevronDown size={16} className="text-zinc-500" />
          </div>
        </td>
        <td className="px-6 py-4 font-medium text-white truncate">{lead.business_name}</td>
        <td className="px-6 py-4 truncate">
          {lead.phone_e164 ? (
            <a href={`tel:${lead.phone_e164}`} onClick={(e) => e.stopPropagation()} className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1.5 transition-colors">
              <Phone size={12} className="shrink-0" /> <span className="truncate">{lead.phone_e164}</span>
            </a>
          ) : <span className="text-zinc-600">—</span>}
        </td>
        <td className="px-6 py-4 truncate">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5 transition-colors">
              <Mail size={12} className="shrink-0" /> <span className="truncate">{lead.email}</span>
            </a>
          ) : <span className="text-zinc-600">—</span>}
        </td>
        <td className="px-6 py-4 text-zinc-300 truncate">{lead.city}</td>
        <td className="px-6 py-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${STATUS_COLORS[lead.status] || "bg-zinc-500/20 text-zinc-400"}`}>
            {lead.status.replace("_", " ")}
          </span>
        </td>
        <td className="px-6 py-4 text-zinc-400 text-xs">
          {lead.last_contact ? new Date(lead.last_contact).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </td>
        <td className="px-6 py-4 text-zinc-400 text-xs">
          {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </td>
      </tr>

      {/* 
        Smooth Animation Wrapper 
        Instead of conditionally rendering, we use a CSS Grid trick (0fr to 1fr) 
        to animate the max-height smoothly without Javascript calculations.
      */}
      <tr>
        <td colSpan={8} className="p-0 border-none">
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="bg-black/40 border-b border-white/5 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="w-full px-6 py-8 md:px-12 lg:px-16">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                    
                    {/* Left Column: Lead Info */}
                    <div className="lg:col-span-5 space-y-6">
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <span className="w-8 h-px bg-white/10"></span>
                          Lead Intelligence
                        </h4>
                        <div className="space-y-3.5 text-sm bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6">
                          <div className="flex items-center gap-3 text-zinc-300 group min-w-0">
                            <div className="p-1.5 rounded-md bg-white/5 text-zinc-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                              <Globe size={14} />
                            </div>
                            {lead.website_url ? (
                              <div className="min-w-0 flex-1">
                                <a 
                                  href={lead.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-zinc-300 hover:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors truncate block"
                                  title={lead.website_url}
                                >
                                  {lead.website_url} <ExternalLink size={10} className="shrink-0 inline-block" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-zinc-600 italic">No website available</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-zinc-300">
                            <div className="p-1.5 rounded-md bg-white/5 text-zinc-500 shrink-0">
                              <MapPin size={14} />
                            </div>
                            <span>{lead.city || <span className="text-zinc-600 italic">Unknown Location</span>}</span>
                          </div>

                          <div className="flex items-center gap-3 text-zinc-300">
                            <div className="p-1.5 rounded-md bg-white/5 text-zinc-500 shrink-0">
                              <Tag size={14} />
                            </div>
                            <span className="capitalize">{lead.category || <span className="text-zinc-600 italic">Uncategorized</span>}</span>
                          </div>

                          {lead.has_ssl !== null && (
                            <div className="flex items-center gap-3 text-zinc-300">
                              <div className={`p-1.5 rounded-md bg-white/5 shrink-0 ${lead.has_ssl ? "text-green-400" : "text-red-400"}`}>
                                <ShieldCheck size={14} />
                              </div>
                              <span>SSL Certificate: <span className={lead.has_ssl ? "text-zinc-300" : "text-zinc-500"}>{lead.has_ssl ? "Secured" : "Not Secured"}</span></span>
                            </div>
                          )}

                          {lead.is_mobile_friendly !== null && (
                            <div className="flex items-center gap-3 text-zinc-300">
                              <div className={`p-1.5 rounded-md bg-white/5 shrink-0 ${lead.is_mobile_friendly ? "text-green-400" : "text-red-400"}`}>
                                <Smartphone size={14} />
                              </div>
                              <span>Mobile Friendly: <span className={lead.is_mobile_friendly ? "text-zinc-300" : "text-zinc-500"}>{lead.is_mobile_friendly ? "Yes" : "No"}</span></span>
                            </div>
                          )}
                          
                          {lead.source?.length > 0 && (
                            <div className="pt-3 mt-3 border-t border-white/5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-zinc-500 mr-1">Sources:</span>
                                {lead.source.map((s) => (
                                  <span key={s} className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-[11px] font-medium rounded-md">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Update Form */}
                    <div className="lg:col-span-7">
                      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-8 h-px bg-white/10"></span>
                        Activity Log
                      </h4>
                      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 md:p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                          <div className="md:col-span-2 max-w-sm">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide block mb-2">Status</label>
                            <CustomDropdown
                              value={status}
                              onChange={(val) => setStatus(val)}
                              options={STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide block mb-2">Notes</label>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                              className="w-full bg-black/50 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none"
                              placeholder="Add context, conversation details, or specific requirements..."
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide block mb-2">Next Action</label>
                            <input
                              type="text"
                              value={nextAction}
                              onChange={(e) => setNextAction(e.target.value)}
                              className="w-full bg-black/50 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                              placeholder="e.g. Send proposal, Call back..."
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide block mb-2">Next Follow Up</label>
                            <input
                              type="datetime-local"
                              value={nextFollowUp}
                              onChange={(e) => setNextFollowUp(e.target.value)}
                              style={{ colorScheme: "dark" }}
                              className="w-full bg-black/50 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-5 border-t border-white/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdate(lead.activity_id, {
                                status,
                                notes: notes || null,
                                next_action: nextAction || null,
                                next_follow_up: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
                              });
                            }}
                            disabled={updating}
                            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-white text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center min-w-[140px]"
                          >
                            {updating ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Saving...
                              </span>
                            ) : (
                              "Save Changes"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
