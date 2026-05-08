import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  UserCog,
  Globe // <-- Added Globe icon
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { getUserRole } from "../hooks/useRole";
import Tooltip from "./Tooltip";

const ADMIN_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/crm", icon: ClipboardList, label: "CRM" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/employees", icon: UserCog, label: "Employees" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

const EMPLOYEE_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/crm/leads", icon: ClipboardList, label: "My Leads" },
  { to: "/crm/history", icon: History, label: "History" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

const SUPER_ADMIN_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admins", icon: UserCog, label: "Admins" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

export default function Layout() {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = getUserRole();

  const NAV = useMemo(() => {
    if (role === "employee") return EMPLOYEE_NAV;
    if (role === "super_admin") return SUPER_ADMIN_NAV;
    return ADMIN_NAV;
  }, [role]);

  return (
    <div className="flex h-screen overflow-hidden bg-black font-sans text-zinc-100">
      
      {/* Desktop Sidebar - Skeuomorphic Deep Black Chassis */}
      <aside 
        className={`hidden md:flex flex-col border-r border-white/5 bg-[#050505] shadow-[20px_0_40px_rgba(0,0,0,0.8)] transition-all duration-300 ease-in-out relative z-20 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Protruding Physical Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-6 bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.8)] hover:bg-[#121214] text-zinc-400 hover:text-white p-1.5 rounded-full transition-all z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar Header */}
        <div className={`flex items-center h-20 border-b border-white/5 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "px-6 gap-3.5"}`}>
          <img src="/logo.png" alt="BRC HUB Logo" className={`object-contain shrink-0 transition-all duration-300 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)] ${isCollapsed ? "w-10 h-10" : "w-10 h-10"}`} />
          {!isCollapsed && (
            <div className="flex flex-col justify-center">
              <p className="text-[9px] text-zinc-500 tracking-[0.2em] font-bold uppercase leading-none mb-1">
                BRC HUB LLP'S
              </p>
              <h1 className="text-xl font-black tracking-tight text-orange-500 leading-none drop-shadow-[0_0_8px_rgba(249,115,22,0.2)]">
                BRC Connect
              </h1>
            </div>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 group ${
                  isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3.5"
                } ${
                  isActive
                    // Active: Deeply recessed carved track
                    ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start" 
                    // Inactive: Flat, pops out on hover
                    : "border border-transparent text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
                }`
              }
            >
              <item.icon size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              
              {/* Skeuomorphic Floating Tooltip */}
              {isCollapsed && (
                <Tooltip label={item.label} side="right" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* External Website & Logout Section */}
        <div className="p-3 border-t border-white/5 bg-[#000000] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] space-y-2">
          
          {/* Added Website Link */}
          <a
            href="https://www.brchub.tech"
            target="_blank"
            rel="noopener noreferrer"
            className={`relative flex items-center w-full rounded-xl text-sm font-bold transition-all duration-200 group border border-transparent text-cyan-500/80 hover:text-cyan-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] ${
              isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3.5"
            }`}
          >
            <Globe size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!isCollapsed && <span>BRC Hub Website</span>}
            {isCollapsed && (
              <Tooltip label="Visit brchub.tech" side="right" />
            )}
          </a>

          {/* Original Logout Button */}
          <button
            onClick={logout}
            className={`relative flex items-center w-full rounded-xl text-sm font-bold transition-all duration-200 group border border-transparent text-zinc-500 hover:text-red-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] ${
              isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3.5"
            }`}
          >
            <LogOut size={20} className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {!isCollapsed && <span>Logout</span>}
            {isCollapsed && (
              <Tooltip label="Logout" side="right" tone="danger" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar - Skeuomorphic Bezel */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BRC HUB Logo" className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
          <div className="flex flex-col justify-center">
             <p className="text-[8px] text-zinc-500 tracking-[0.2em] font-bold uppercase leading-none mb-1">
               BRC HUB LLP'S
             </p>
             <h1 className="text-lg font-black tracking-tight text-orange-500 leading-none drop-shadow-[0_0_5px_rgba(249,115,22,0.2)]">
               BRC Connect
             </h1>
          </div>
        </div>
        {/* Mobile Protruding Menu Button */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#121214] transition-all active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] active:bg-black"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Slide-over Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${
          mobileOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* Dark blurred backdrop (clickable to close) */}
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
        />
        
        {/* Sliding Sidebar Panel - Mobile */}
        <aside
          className={`absolute left-0 top-16 bottom-0 w-64 bg-[#050505] border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.9)] flex flex-col pb-20 transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start"
                      : "border border-transparent text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 bg-[#000000] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] space-y-2">
            {/* Added Website Link for Mobile */}
            <a
              href="https://www.brchub.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-transparent text-sm font-bold text-cyan-500/80 hover:text-cyan-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] transition-all"
            >
              <Globe size={20} />
              BRC Hub Website
            </a>

            {/* Original Mobile Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-transparent text-sm font-bold text-zinc-500 hover:text-red-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-black pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-start/5 blur-[150px] rounded-full pointer-events-none z-0" />
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto relative z-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav - Protruding Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around px-2 pb-safe border-t border-white/5 bg-black/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        {NAV.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-extrabold tracking-wide transition-all duration-200 ${
                isActive ? "text-accent-start -translate-y-1" : "text-zinc-600 hover:text-zinc-300"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={20} 
                  className={isActive ? "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" : ""} 
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}