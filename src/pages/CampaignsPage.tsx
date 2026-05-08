import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  X,
  Megaphone,
  ChevronRight,
  Trash2,
  Users,
  Briefcase,
  Clock,
  ShieldOff,
  Info,
  Loader2
} from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import { useCampaigns, useCreateCampaign } from "../hooks/useApi";
import { getUserRole } from "../hooks/useRole";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import toast from "react-hot-toast";

interface SimpleEmployee {
  id: string;
  name: string;
  email: string;
}

export default function CampaignsPage() {
  const MAX_CITIES = 2;
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);

  useEffect(() => {
    if ([...searchParams.keys()].length === 0) {
      const savedParams = sessionStorage.getItem("campaigns_url_params");
      if (savedParams) {
        setSearchParams(new URLSearchParams(savedParams), { replace: true });
      }
    }
  }, []);

  useEffect(() => {
    if ([...searchParams.keys()].length > 0) {
      sessionStorage.setItem("campaigns_url_params", searchParams.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    const visited = sessionStorage.getItem("lastVisitedCampaign");
    if (visited) {
      setLastVisitedId(visited);
    }
  }, []);

  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const { data, isLoading, error, refetch } = useCampaigns(pageParam, 10);
  const create = useCreateCampaign();
  const navigate = useNavigate();
  
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sources] = useState<string[]>(["google_maps"]);
  const [cities, setCities] = useState("");
  const [categories, setCategories] = useState("");
  const [autoRescrape, setAutoRescrape] = useState(false);
  const [dropNoContact, setDropNoContact] = useState(true);
  const [assignedTo, setAssignedTo] = useState("");
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const role = getUserRole();

  // Helper function to normalize and deduplicate tags (Cities/Categories)
// Helper function to normalize and deduplicate ANY comma-separated tags
const normalizeAndDeduplicate = (input: string, maxItems?: number): string[] => {
  const uniqueItems = new Map<string, string>();
  
  input.split(",").forEach((item) => {
    const trimmed = item.trim();
    if (trimmed) {
      // Lowercase key for strict deduplication
      const lowerKey = trimmed.toLowerCase();
      
      // Title Case for premium UI display
      const titleCased = trimmed
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

      if (!uniqueItems.has(lowerKey) && (!maxItems || uniqueItems.size < maxItems)) {
        uniqueItems.set(lowerKey, titleCased);
      }
    }
  });

  return Array.from(uniqueItems.values());
};

  useEffect(() => {
    if (role === "admin") {
      api.get<{ data: SimpleEmployee[] }>("/users/employees")
        .then((res) => setEmployees(res.data || []))
        .catch(() => {});
    }
  }, [role]);

  const campaigns = data?.data || [];
  const meta = data?.meta;
  const uniqueCityCount = normalizeAndDeduplicate(cities).length;

  useEffect(() => {
    if (lastVisitedId && campaigns.length > 0) {
      const timer = setTimeout(() => {
        const card = document.getElementById(`campaign-${lastVisitedId}`);
        if (card && card.offsetParent !== null) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastVisitedId, campaigns]);

  function updatePage(newPage: number) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
  }

  function handleRowClick(id: string) {
    sessionStorage.setItem("lastVisitedCampaign", id);
  }

 async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  
  // Clean BOTH inputs before creating the payload
  const allUniqueCities = normalizeAndDeduplicate(cities);
  const cleanCities = normalizeAndDeduplicate(cities, MAX_CITIES);
  const cleanCategories = normalizeAndDeduplicate(categories);

  if (allUniqueCities.length > MAX_CITIES) {
    toast.error(`You can add at most ${MAX_CITIES} cities per campaign.`);
    setCities(cleanCities.join(", "));
    return;
  }

  try {
    const payload: any = {
      name,
      sources,
      cities: cleanCities,         // Cleaned array
      categories: cleanCategories, // Cleaned array
      auto_rescrape: autoRescrape,
      drop_no_contact: dropNoContact,
    };
    
    if (assignedTo) payload.assigned_to = assignedTo;
    
    // ... rest of your API call
    
    const result = await create.mutateAsync(payload);
    toast.success("Campaign created");
    
    // Reset states
    setShowForm(false);
    setName("");
    setCities("");
    setCategories("");
    setAutoRescrape(false);
    setDropNoContact(true);
    setAssignedTo("");
    
    navigate(`/campaigns/${result.id}`);
  } catch (err) {
    toast.error((err as Error).message);
  }
}

  async function handleDeleteCampaign(campaignId: string, campaignName: string) {
    const ok = window.confirm(`Delete campaign "${campaignName}" and associated leads? This cannot be undone.`);
    if (!ok) return;

    setDeletingCampaignId(campaignId);
    try {
      const res = await api.delete<{ status: string; deleted_leads: number }>(`/campaigns/${campaignId}`);
      toast.success(`Campaign deleted. Removed ${res.deleted_leads ?? 0} associated leads.`);
      if (lastVisitedId === campaignId) {
        sessionStorage.removeItem("lastVisitedCampaign");
        setLastVisitedId(null);
      }
      await refetch();
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete campaign");
    } finally {
      setDeletingCampaignId(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Campaigns
          </h2>
          {meta && (
            <p className="text-sm text-zinc-400 mt-1.5 ">
              Managing {meta.total} active scraping engines
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
            showForm 
              ? "bg-[#09090b] text-white hover:bg-[#121214] border border-white/10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)]" 
              : "bg-gradient-to-r from-accent-start to-accent-end text-zinc-950 hover:opacity-90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(52,211,153,0.3)]"
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "New Campaign"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 sm:p-8 mb-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] space-y-6 animate-in slide-in-from-top-4 fade-in duration-300 relative overflow-visible"
        >
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-start/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <label className="block text-sm font-bold text-zinc-300 mb-2">Campaign Name</label>
            {/* Recessed Input Field */}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:bg-[#0c0c0e] focus:border-accent-start/50 transition-all"
              placeholder="e.g. Plumbers in New York"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-2">
                Target Cities <span className="text-zinc-500 font-normal ml-1">(comma separated, max {MAX_CITIES})</span>
              </label>
              <input
  value={cities}
  onChange={(e) => setCities(e.target.value)}
  onBlur={() => setCities(normalizeAndDeduplicate(cities, MAX_CITIES).join(", "))}
  required
  className="w-full rounded-xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:bg-[#0c0c0e] focus:border-accent-start/50 transition-all"
  placeholder="New York, Chicago"
/>
              <p className={`mt-1 text-xs ${uniqueCityCount > MAX_CITIES ? "text-amber-300" : "text-zinc-500"}`}>
                {uniqueCityCount}/{MAX_CITIES} cities selected
              </p>
            </div>
            <div>
  <label className="block text-sm font-bold text-zinc-300 mb-2">
    Niche / Categories <span className="text-zinc-500 font-normal ml-1">(comma separated)</span>
  </label>
  <input
    value={categories}
    onChange={(e) => setCategories(e.target.value)}
    // UX MAGIC: Auto-format and deduplicate on click-away
    onBlur={() => setCategories(normalizeAndDeduplicate(categories).join(", "))} 
    required
    className="w-full rounded-xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:bg-[#0c0c0e] focus:border-accent-start/50 transition-all"
    placeholder="Plumbers, Restaurants, Dentists"
  />
</div>
          </div>

          {/* Assign to Employee (admin only) */}
          {role === "admin" && employees.length > 0 && (
            // FIX: Bumped z-index up to 50 so the dropdown breaks out and sits above the warning banner below it
            <div className="relative z-50">
              <label className="block text-sm font-bold text-zinc-300 mb-2">
                Assign to Employee <span className="text-zinc-500 font-normal ml-1">(optional)</span>
              </label>
              <CustomDropdown
                value={assignedTo}
                onChange={(val) => setAssignedTo(val)}
                placeholder="-- Unassigned --"
                options={[
                  { value: "", label: "-- Unassigned --" },
                  ...employees.map(emp => ({
                    value: emp.id,
                    label: emp.name // Much cleaner, single-line UI
                  }))
                ]}
              />
            </div>
          )}

          {/* Warning Banner - Recessed */}
          <div className="flex items-start gap-2.5 mt-2 bg-[#09090b] border border-amber-500/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] p-4 rounded-xl relative z-10">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              <strong className="text-amber-400 font-semibold">Important:</strong> The tool handles upper/lowercase automatically, but it cannot auto-correct spelling mistakes. Please double-check your city and category names to ensure successful lead generation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative z-10">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={dropNoContact}
                  onChange={(e) => setDropNoContact(e.target.checked)}
                  className="sr-only peer"
                />
                {/* Skeuomorphic Toggle Switch */}
                <div className="w-10 h-6 rounded-full bg-[#121214] border border-white/5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] peer-checked:bg-amber-500 peer-checked:shadow-[inset_0_2px_6px_rgba(0,0,0,0.3)] transition-colors duration-300" />
                <div className="absolute left-1 w-4 h-4 rounded-full bg-zinc-400 peer-checked:bg-white peer-checked:translate-x-4 transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldOff size={14} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  <span className="text-sm font-medium text-zinc-200">Drop No-Contact</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Discard leads missing both phone & email</p>
              </div>
            </label>
          </div>

          <div className="pt-2 relative z-10">
            <button
              type="submit"
              disabled={create.isPending}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-sm font-extrabold text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(52,211,153,0.3)] transition-all duration-200 hover:opacity-90 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_12px_20px_rgba(52,211,153,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {create.isPending ? <><Loader2 className="animate-spin" size={18} /> <span>Initializing Engine...</span></> : "Launch Campaign"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} />}

      {!isLoading && !error && (
        <>
          {campaigns.length === 0 && (
            // Empty State - Skeuomorphic
            <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-16 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]">
              <div className="w-20 h-20 rounded-3xl bg-[#09090b] mx-auto mb-6 flex items-center justify-center border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)]">
                <Megaphone className="text-zinc-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No active campaigns</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Configure your first data scraping campaign to start populating your lead database.
              </p>
            </div>
          )}

          <div className="space-y-4 sm:space-y-5">
            {campaigns.map((c: any) => {
              const pct = c.jobs_total > 0 ? Math.round((c.jobs_completed / c.jobs_total) * 100) : 0;
              const isHighlighted = c.id === lastVisitedId;

              return (
                <Link
                  key={c.id}
                  id={`campaign-${c.id}`}
                  to={`/campaigns/${c.id}`}
                  onClick={() => handleRowClick(c.id)}
                  // Skeuomorphic Campaign Cards
                  className={`group block rounded-2xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#0a0a0c] p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${
                    isHighlighted 
                      ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_30px_rgba(52,211,153,0.15)] border-accent-start/30 z-10" 
                      : "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_30px_rgba(52,211,153,0.1)] hover:-translate-y-1"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute inset-0 bg-accent-start/5 pointer-events-none" />
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className={`text-xl font-extrabold truncate transition-colors ${isHighlighted ? "text-accent-start" : "text-white group-hover:text-accent-start"}`}>
                          {c.name}
                        </h3>
                        <StatusBadge status={c.status} />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-zinc-500">
                        {/* Recessed Pill Badges */}
                        <span className="inline-flex items-center gap-1.5 text-zinc-300 bg-[#09090b] px-2.5 py-1.5 rounded-lg border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                          <Briefcase size={12} className="text-accent-start" />
                          {c.sources?.map((s: string) => s.replace(/_/g, " ")).join(", ")}
                        </span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]" />{c.cities?.join(", ")}</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]" />{c.categories?.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-white/5 p-4 rounded-2xl md:bg-transparent md:border-none md:shadow-none md:p-0">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          <Clock size={12} /> {c.jobs_completed} / {c.jobs_total} tasks
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-base font-black text-accent-start drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                          <Users size={16} /> {c.leads_found.toLocaleString()} leads
                        </div>
                      </div>

                      <div className="relative w-14 h-14 shrink-0 bg-[#09090b] rounded-full border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center p-1">
                        <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                          <circle cx="22" cy="22" r="18" fill="none" stroke="url(#progressGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 113} 113`} className="transition-all duration-1000 ease-out" />
                          <defs>
                            <linearGradient id="progressGrad">
                              <stop offset="0%" stopColor="var(--color-accent-start)" />
                              <stop offset="100%" stopColor="var(--color-accent-end)" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{pct}%</span>
                      </div>

                      {/* Neumorphic Arrow Button */}
                      <button
                        type="button"
                        disabled={deletingCampaignId === c.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteCampaign(c.id, c.name);
                        }}
                        className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center hover:bg-red-500/10 transition-colors hidden md:flex disabled:opacity-50"
                        title="Delete campaign"
                      >
                        {deletingCampaignId === c.id ? (
                          <Loader2 size={16} className="text-red-400 animate-spin" />
                        ) : (
                          <Trash2 size={16} className="text-zinc-500 hover:text-red-400 transition-colors" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:bg-accent-start/10 transition-colors hidden md:flex">
                        <ChevronRight size={18} className="text-zinc-500 group-hover:text-accent-start group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>

                  {(c.auto_rescrape || c.drop_no_contact) && (
                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/5 relative z-10">
                      {c.drop_no_contact && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          <ShieldOff size={10} /> Drop No-Contact
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 sm:hidden text-xs font-bold uppercase tracking-wider border-t border-white/5 pt-4 relative z-10">
                    <span className="text-zinc-500 flex items-center gap-1.5"><Clock size={12} /> {c.jobs_completed}/{c.jobs_total}</span>
                    <span className="text-accent-start flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"><Users size={12} /> {c.leads_found.toLocaleString()} leads</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-10 flex justify-center pb-8">
              <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={updatePage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}