import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, ExternalLink, Search, Filter, FastForward, UserPlus, Phone, Mail, X } from "lucide-react";
import { useLeads, useUpdateLead } from "../hooks/useApi";
import { api, getExportUrl, getToken } from "../api/client";
import { getUserRole } from "../hooks/useRole";
import type { LeadFilters } from "../types";
import StatusBadge from "../components/StatusBadge";
import ScoreBadge from "../components/ScoreBadge";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import Tooltip from "../components/Tooltip";
import toast from "react-hot-toast";

import CustomDropdown from "../components/CustomDropdown";

// Helper function to handle case-sensitivity issues from the backend.
// Formats strings like "new york" to "New York"
const toTitleCase = (str: string) => {
  return str
    .trim()
    .split(" ")
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
};

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);
  const [jumpPage, setJumpPage] = useState("");
  const role = getUserRole();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [assignEmployee, setAssignEmployee] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (role === "admin") {
      api.get<{ data: { id: string; name: string; email: string }[] }>("/users/employees")
        .then((res) => setEmployees(res.data || []))
        .catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    if ([...searchParams.keys()].length === 0) {
      const savedParams = sessionStorage.getItem("leads_url_params");
      if (savedParams) {
        setSearchParams(new URLSearchParams(savedParams), { replace: true });
      }
    }
  }, []);

  useEffect(() => {
    if ([...searchParams.keys()].length > 0) {
      sessionStorage.setItem("leads_url_params", searchParams.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    const visited = sessionStorage.getItem("lastVisitedLead");
    if (visited) {
      setLastVisitedId(visited);
    }
  }, []);

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const statusParam = searchParams.get("status") || "";
  const scoreParam = searchParams.get("score_gte") || "";
  const cityParam = searchParams.get("city") || "";

  const filters: LeadFilters = {
    page: pageParam,
    page_size: 25,
    status: statusParam || undefined,
    score_gte: scoreParam ? parseInt(scoreParam, 10) : undefined,
    city: cityParam || undefined,
  };

  const [cityInput, setCityInput] = useState(cityParam);

  useEffect(() => {
    setCityInput(cityParam);
  }, [cityParam]);

  const { data, isLoading, error } = useLeads(filters);
  const updateLead = useUpdateLead();

  const leads = data?.data || [];
  const meta = data?.meta;

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageParam, statusParam, scoreParam, cityParam]);

  useEffect(() => {
    if (lastVisitedId && leads.length > 0) {
      const timer = setTimeout(() => {
        const desktopRow = document.getElementById(`lead-desktop-${lastVisitedId}`);
        const mobileCard = document.getElementById(`lead-mobile-${lastVisitedId}`);
        
        if (desktopRow && desktopRow.offsetParent !== null) {
          desktopRow.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (mobileCard && mobileCard.offsetParent !== null) {
          mobileCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastVisitedId, leads]);

  function updateURLParams(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== "page") {
      newParams.set("page", "1");
    }
    setSearchParams(newParams);
  }

  // UX Improvement: Normalize city name before updating parameters
  function applyCity() {
    if (!cityInput.trim()) {
      updateURLParams("city", "");
      return;
    }
    const formattedCity = toTitleCase(cityInput);
    setCityInput(formattedCity); // Visually snap the input to the correct casing
    updateURLParams("city", formattedCity); // Send clean data to backend
  }

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetPage = parseInt(jumpPage, 10);
    const maxPage = meta?.totalPages || 1;

    if (isNaN(targetPage) || targetPage < 1 || targetPage > maxPage) {
      toast.error(`Please enter a valid page between 1 and ${maxPage}`);
      return;
    }
    
    updateURLParams("page", String(targetPage));
    setJumpPage(""); 
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateLead.mutateAsync({ id, data: { status: status as "new" } });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update");
    }
  }

  function handleExport() {
    const params: Record<string, string> = {};
    if (filters.city) params.city = filters.city;
    if (filters.score_gte != null) params.score_gte = String(filters.score_gte);
    if (filters.status) params.status = filters.status;
    const token = getToken();
    if (token) params.token = token;
    window.open(getExportUrl(params), "_blank");
  }

  async function handleBulkAssign() {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    try {
      await api.post("/leads/assign", {
        lead_ids: [...selectedIds],
        employee_id: assignEmployee || "",
      });
      toast.success(`${selectedIds.size} lead(s) ${assignEmployee ? "assigned" : "unassigned"}`);
      setSelectedIds(new Set());
      setAssignEmployee("");
    } catch {
      toast.error("Failed to assign leads");
    } finally {
      setAssigning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l: any) => l.id)));
    }
  }

  function handleRowClick(id: string) {
    sessionStorage.setItem("lastVisitedLead", id);
  }

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox message={(error as Error).message} />;

  const paginationControls = (
    <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full justify-between">
      <div className="hidden sm:block flex-1" /> 
      
      <div className="flex-shrink-0">
        <Pagination
          page={meta?.page || 1}
          totalPages={meta?.totalPages || 1}
          onPageChange={(p) => updateURLParams("page", String(p))}
        />
      </div>

      <div className="flex-1 flex justify-end">
        {/* Skeuomorphic Jump Input */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 bg-[#09090b] border border-white/5 p-1.5 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2 pr-1 hidden sm:block">Jump</span>
          <input 
            type="number" 
            min="1" 
            max={meta?.totalPages || 1}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder="Pg"
            className="w-10 bg-transparent text-sm font-bold text-center text-white placeholder:text-zinc-600 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {/* Skeuomorphic Protruding Button */}
          <button 
            type="submit"
            disabled={!jumpPage}
            className="p-2 rounded-lg bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.5)] text-accent-start hover:text-black hover:bg-accent-start disabled:opacity-30 disabled:hover:bg-[#121214] disabled:hover:text-accent-start transition-all cursor-pointer"
          >
            <FastForward size={14} className="fill-current" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Lead Database
          </h2>
          {meta && (
            <p className="text-sm text-zinc-400 mt-1.5">
              Showing <strong className="text-white">{meta.total.toLocaleString()}</strong> captured leads
            </p>
          )}
        </div>
        {/* Skeuomorphic Action Button */}
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] text-sm font-bold text-white hover:text-accent-start transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
        >
          <Download size={16} className="text-zinc-400 group-hover:text-accent-start transition-colors" />
          Export CSV
        </button>
      </div>

      {/* Filter Toolbar - Main Skeuomorphic Panel */}
      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-4 sm:p-5 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row lg:items-center gap-4 relative z-20">
        <div className="flex items-center gap-2 text-zinc-400 shrink-0 hidden lg:flex px-2">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <CustomDropdown 
            value={filters.status || ""}
            onChange={(val) => updateURLParams("status", val)}
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "converted", label: "Converted" },
              { value: "closed", label: "Closed" }
            ]}
          />
          
          <CustomDropdown 
            value={filters.score_gte?.toString() || ""}
            onChange={(val) => updateURLParams("score_gte", val)}
            placeholder="All Scores"
            options={[
              { value: "", label: "All Scores" },
              { value: "70", label: "Hot (70+)" },
              { value: "40", label: "Warm (40+)" },
              { value: "0", label: "Cold (All)" }
            ]}
          />

          {/* Skeuomorphic Search Input Group - UX IMPROVED */}
          <div className="flex items-center w-full sm:w-auto flex-1 max-w-md rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] p-1 relative">
            <input
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                // UX: Automatically clear the filter if the user backspaces until empty
                if (e.target.value.trim() === "") {
                  updateURLParams("city", "");
                }
              }}
              // UX: Automatically correct capitalization when user clicks away
              onBlur={() => {
                if (cityInput.trim()) {
                  setCityInput(toTitleCase(cityInput));
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && applyCity()}
              placeholder="Filter by City..."
              className="w-full bg-transparent pl-4 pr-2 py-2 text-sm font-bold text-white placeholder:text-zinc-600 outline-none"
            />
            {/* UX: Clear Search Button */}
            {cityInput && (
              <button
                onClick={() => {
                  setCityInput("");
                  updateURLParams("city", "");
                }}
                className="p-1.5 mr-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={applyCity}
              className="group relative shrink-0 px-3 py-2 rounded-lg bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)] text-zinc-400 hover:text-accent-start transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Search city"
            >
              <Search size={16} />
              <Tooltip label="Search city" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Assign Toolbar — Admin Only */}
      {role === "admin" && selectedIds.size > 0 && (
        <div className="rounded-2xl border border-accent-start/30 bg-accent-start/5 backdrop-blur-sm p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[0_10px_20px_rgba(52,211,153,0.1)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-sm font-bold text-accent-start">
            <UserPlus size={16} />
            <span>{selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selected</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            <select
              value={assignEmployee}
              onChange={(e) => setAssignEmployee(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] px-4 py-2 text-sm text-white outline-none focus:border-accent-start/50 transition-all w-full sm:w-auto min-w-[200px]"
              style={{ colorScheme: "dark" }}
            >
              <option value="">-- Unassign --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={assigning}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-sm font-extrabold text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_8px_rgba(52,211,153,0.3)] transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {assigning ? "Assigning..." : assignEmployee ? "Assign" : "Unassign"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Top Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mb-4">
          {paginationControls}
        </div>
      )}

      {/* Desktop Data Grid - Main Skeuomorphic Panel */}
      <div className="hidden lg:block rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] mb-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-accent-start/5 blur-[120px] pointer-events-none" />

        <div className="overflow-x-auto overflow-y-visible pb-24 -mb-24 relative z-10">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 border-b border-white/5 backdrop-blur-md">
              <tr>
                {role === "admin" && (
                  <th className="px-4 py-5 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedIds.size === leads.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-white/20 bg-[#09090b] accent-emerald-400 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Business</th>
                <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Contact</th>
                <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Location</th>
                <th className="px-6 py-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Score</th>
                <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Status</th>
                {role === "admin" && (
                  <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Assigned To</th>
                )}
                <th className="px-6 py-5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Source Links</th>
                <th className="px-6 py-5 text-right text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead: any) => {
                const isHighlighted = lead.id === lastVisitedId;
                
                return (
                  <tr
                    key={lead.id}
                    id={`lead-desktop-${lead.id}`}
                    className={`transition-colors duration-150 group ${
                      isHighlighted ? "bg-accent-start/5" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {role === "admin" && (
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-white/20 bg-[#09090b] accent-emerald-400 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="relative px-6 py-4 min-w-[200px] max-w-[320px] whitespace-normal break-words">
                      
                      {isHighlighted && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-start shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      )}

                      <Link
                        to={`/leads/${lead.id}`}
                        onClick={() => handleRowClick(lead.id)}
                        className={`font-bold transition-colors block mb-1 leading-snug ${
                          isHighlighted ? "text-accent-start hover:text-white" : "text-white hover:text-accent-start"
                        }`}
                      >
                        {lead.business_name}
                      </Link>
                      {lead.website_url && (
                        <a
                          href={lead.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-start/80 hover:text-accent-start hover:underline truncate max-w-[250px]"
                        >
                          {lead.website_url.replace(/^https?:\/\/(www\.)?/, "")}
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="mb-1">
                        {lead.phone_e164 ? (
                          <a href={`tel:${lead.phone_e164}`} className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-cyan-400 font-bold transition-colors">
                            <Phone size={12} /> {lead.phone_e164}
                          </a>
                        ) : (
                          <span className="text-zinc-700 font-medium">No Phone</span>
                        )}
                      </div>
                      <div className="text-xs font-medium truncate max-w-[180px]">
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-orange-400 transition-colors">
                            <Mail size={11} /> {lead.email}
                          </a>
                        ) : (
                          <span className="text-zinc-700">No Email</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-medium">
                      {lead.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <ScoreBadge value={lead.lead_score} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    {role === "admin" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.assigned_to_name ? (
                          <span className="text-xs font-bold text-accent-start bg-accent-start/10 px-2.5 py-1 rounded-lg border border-accent-start/20">
                            {lead.assigned_to_name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-zinc-600 italic">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 min-w-[140px]">
                      <div className="flex flex-wrap gap-2">
                        {lead.source?.map((s: string) => {
                          const url = lead.source_urls?.[s];
                          return url ? (
                            <a
                              key={s}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-accent-start hover:bg-accent-start/10 transition-colors"
                            >
                              {s.replace(/_/g, " ")}
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span key={s} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-zinc-500">
                              {s.replace(/_/g, " ")}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end">
                      <CustomDropdown 
                        value={lead.status}
                        onChange={(val) => handleStatusChange(lead.id, val)}
                        size="sm"
                        align="right"
                        options={[
                          { value: "new", label: "New" },
                          { value: "contacted", label: "Contacted" },
                          { value: "qualified", label: "Qualified" },
                          { value: "converted", label: "Converted" },
                          { value: "closed", label: "Closed" }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {leads.length === 0 && (
            <div className="p-16 text-center border-t border-white/5">
              <div className="w-16 h-16 rounded-2xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] mx-auto mb-4 flex items-center justify-center">
                <Search className="text-zinc-500" size={24} />
              </div>
              <p className="text-zinc-300 font-bold text-lg">No leads found</p>
              <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card Layout - Skeuomorphic */}
      <div className="lg:hidden space-y-5 mb-8">
        {leads.map((lead: any, index: number) => {
          const isHighlighted = lead.id === lastVisitedId;
          
          return (
            <div
              key={lead.id}
              id={`lead-mobile-${lead.id}`}
              style={{ zIndex: 100 - index }}
              className={`block rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#0a0a0c] p-6 transition-all duration-300 relative ${
                isHighlighted 
                  ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_15px_30px_rgba(52,211,153,0.15)] border-accent-start/30 z-10" 
                  : "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.5)]"
              }`}
            >
              <Link 
                to={`/leads/${lead.id}`} 
                onClick={() => handleRowClick(lead.id)}
                className="absolute inset-0 z-0" 
              />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4 pointer-events-none">
                  <div className="pr-4">
                    <h3 className={`font-extrabold text-xl leading-tight mb-2 ${isHighlighted ? "text-accent-start" : "text-white"}`}>
                      {lead.business_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <span className="text-accent-start/80">{lead.city}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{lead.source?.map((s: string) => s.replace(/_/g, " ")).join(", ")}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ScoreBadge value={lead.lead_score} />
                  </div>
                </div>
                
                {/* Recessed Contact Box */}
                <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-xl p-4 mb-5">
                  <p className="text-sm text-zinc-200 font-bold mb-1">
                    {lead.phone_e164 ? (
                      <a href={`tel:${lead.phone_e164}`} className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                        <Phone size={13} /> {lead.phone_e164}
                      </a>
                    ) : (
                      <span className="text-zinc-600 italic font-medium">No phone provided</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 font-medium truncate">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-orange-400 transition-colors">
                        <Mail size={12} /> {lead.email}
                      </a>
                    ) : (
                      <span className="text-zinc-600 italic">No email provided</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <StatusBadge status={lead.status} />
                  
                  <CustomDropdown 
                    value={lead.status}
                    onChange={(val) => handleStatusChange(lead.id, val)}
                    size="sm"
                    align="right"
                    options={[
                      { value: "new", label: "New" },
                      { value: "contacted", label: "Contacted" },
                      { value: "qualified", label: "Qualified" },
                      { value: "converted", label: "Converted" },
                      { value: "closed", label: "Closed" }
                    ]}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {leads.length === 0 && (
          <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-12 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]">
             <div className="w-16 h-16 rounded-2xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] mx-auto mb-4 flex items-center justify-center">
               <Search className="text-zinc-500" size={24} />
             </div>
             <p className="text-zinc-400 font-bold text-sm">No leads match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="pb-4">
        {paginationControls}
      </div>

    </div>
  );
}