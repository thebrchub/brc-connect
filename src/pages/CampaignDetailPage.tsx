import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Tags, 
  Briefcase, 
  ShieldOff, 
  Calendar, 
  RefreshCw, 
  Users, 
  Activity,
  Target,
  Settings,
  UserCheck
} from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import { useCampaignStatus } from "../hooks/useApi";
import { getUserRole } from "../hooks/useRole";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import toast from "react-hot-toast";

interface SimpleEmployee {
  id: string;
  name: string;
  email: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading, error, refetch } = useCampaignStatus(id!);
  const role = getUserRole();
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (role === "admin") {
      api.get<{ data: SimpleEmployee[] }>("/users/employees")
        .then((res) => setEmployees(res.data || []))
        .catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    if (campaign?.assigned_to) {
      setAssignedTo(campaign.assigned_to);
    }
  }, [campaign?.assigned_to]);

  async function handleAssign() {
    if (!assignedTo || !id) return;
    setAssigning(true);
    try {
      await api.patch(`/campaigns/${id}/assign`, { employee_id: assignedTo });
      toast.success("Campaign assigned successfully");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox message={(error as Error).message} />;
  if (!campaign) return <ErrorBox message="Campaign not found" />;

  const pct =
    campaign.jobs_total > 0
      ? Math.round((campaign.jobs_completed / campaign.jobs_total) * 100)
      : 0;

  const showIndeterminate =
    campaign.status === "running" &&
    campaign.jobs_total > 0 &&
    campaign.jobs_completed === 0;

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* Premium Skeuomorphic Back Navigation */}
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-3 text-sm font-bold text-zinc-400 hover:text-accent-start transition-colors mb-6 group"
      >
        <div className="w-8 h-8 rounded-lg bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:bg-accent-start/10 transition-colors">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </div>
        Back to Campaigns
      </Link>

      {/* Campaign Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            {campaign.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {/* Recessed Badges */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] text-xs font-bold text-zinc-300">
              <MapPin size={14} className="text-accent-start" />
              {campaign.cities?.join(", ")}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#09090b] border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] text-xs font-bold text-zinc-300">
              <Tags size={14} className="text-accent-start" />
              {campaign.categories?.join(", ")}
            </div>
          </div>
        </div>
        <div className="shrink-0 mt-2 md:mt-0">
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {/* Hero Telemetry Card - Main Skeuomorphic Panel */}
      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 sm:p-8 mb-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-start/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          
          {/* Left Side: Progress Bar */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <Activity size={14} className="text-accent-start" />
                  </div>
                  Extraction Progress
                </h3>
                <p className="text-sm font-medium text-zinc-400 mt-2 ml-11">
                  {campaign.jobs_completed} of {campaign.jobs_total} jobs completed
                </p>
              </div>
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-start to-accent-end drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                {pct}%
              </span>
            </div>
            
            {/* Deeply Recessed Progress Track */}
            <div className="h-5 rounded-full bg-[#09090b] border border-white/5 overflow-hidden p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] ml-11 relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-1000 ease-out relative overflow-hidden shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                style={{ width: `${pct}%` }}
              >
                {/* Active Processing Stripes Overlay */}
                {campaign.status === "running" && pct > 0 && pct < 100 && (
                  <div className="absolute inset-0 bg-stripes animate-stripes opacity-60" />
                )}
              </div>

              {showIndeterminate && (
                <>
                  <div className="absolute inset-0 bg-stripes animate-stripes opacity-30" />
                  <div className="absolute left-0 top-0 h-full w-20 rounded-full bg-white/10 animate-indeterminate" />
                </>
              )}
            </div>
          </div>

          {/* Right Side: Leads Found Hero Stat */}
          <div className="lg:border-l border-white/5 lg:pl-8 flex flex-col justify-center mt-6 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0">
            <div className="flex items-center gap-3 text-sm font-bold text-zinc-400 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <Users size={14} className="text-accent-start" />
              </div>
              Total Extracted
            </div>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(52,211,153,0.2)] ml-11">
              {campaign.leads_found.toLocaleString()}
            </div>
            {campaign.status === "running" && (
              <div className="flex items-center gap-2 mt-3 text-xs font-bold uppercase tracking-wider text-accent-start animate-pulse ml-11">
                <Target size={12} />
                Actively hunting...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Configuration Details */}
      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <Settings size={18} className="text-zinc-400" />
          </div>
          Engine Configuration
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Sources - Carved In */}
          <div className="bg-[#09090b] border border-white/5 p-5 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:bg-[#0c0c0e] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-start/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-accent-start/10 transition-colors" />
            <div className="flex items-center gap-3 text-zinc-400 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <Briefcase size={14} className="text-accent-start" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Sources</span>
            </div>
            <p className="text-sm font-extrabold text-white relative z-10 ml-11">
              {campaign.sources?.map((s: string) => s.replace(/_/g, " ")).join(", ")}
            </p>
          </div>

          {/* Drop No-Contact - Carved In */}
          <div className="bg-[#09090b] border border-white/5 p-5 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:bg-[#0c0c0e] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-400/10 transition-colors" />
            <div className="flex items-center gap-3 text-zinc-400 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <ShieldOff size={14} className="text-amber-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Filtering</span>
            </div>
            <div className="flex items-center gap-2 relative z-10 ml-11">
              <p className="text-sm font-semibold text-zinc-300">No-Contact:</p>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${campaign.drop_no_contact ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-zinc-500 border border-white/10'}`}>
                {campaign.drop_no_contact ? "Dropped" : "Kept"}
              </span>
            </div>
          </div>

          {/* Created Date - Carved In */}
          <div className="bg-[#09090b] border border-white/5 p-5 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:bg-[#0c0c0e] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-400/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-zinc-400/10 transition-colors" />
            <div className="flex items-center gap-3 text-zinc-400 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <Calendar size={14} className="text-zinc-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Created</span>
            </div>
            <p className="text-sm font-extrabold text-white relative z-10 ml-11">
              {new Date(campaign.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Last Updated - Carved In */}
          <div className="bg-[#09090b] border border-white/5 p-5 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:bg-[#0c0c0e] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-400/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-zinc-400/10 transition-colors" />
            <div className="flex items-center gap-3 text-zinc-400 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#121214] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <RefreshCw size={14} className="text-zinc-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Updated</span>
            </div>
            <p className="text-sm font-extrabold text-white relative z-10 ml-11">
              {new Date(campaign.updated_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

        </div>
      </div>

      {/* Assign to Employee - Admin Only */}
      {role === "admin" && employees.length > 0 && (
        <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-6 sm:p-8 mt-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)]">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <UserCheck size={18} className="text-accent-start" />
            </div>
            Assign to Employee
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Employee</label>
              <CustomDropdown
                value={assignedTo}
                onChange={(val) => setAssignedTo(val)}
                placeholder="-- Select Employee --"
                options={[
                  { value: "", label: "-- Select Employee --" },
                  ...employees.map(emp => ({
                    value: emp.id,
                    label: `${emp.name} (${emp.email})`
                  }))
                ]}
              />
            </div>
            <button
              onClick={handleAssign}
              disabled={!assignedTo || assigning}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-sm font-extrabold text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(52,211,153,0.3)] transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {assigning ? "Assigning..." : "Assign Campaign"}
            </button>
          </div>
          {campaign?.assigned_to && (
            <p className="mt-4 text-xs text-zinc-500">
              Currently assigned to: <span className="text-zinc-300 font-medium">{employees.find(e => e.id === campaign.assigned_to)?.name || campaign.assigned_to}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
