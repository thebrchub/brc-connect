import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  Menu,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  UserCog,
  Globe,
  MessageCircle,
  User
} from "lucide-react";
import { useState, useMemo } from "react";
import { getUserRole } from "../hooks/useRole";
import Tooltip from "./Tooltip";
import { useChatContext } from "../chat/ChatContext";
import { CallProvider, useCallContext } from "../chat/CallContext";
import { useContacts, useRooms } from "../chat/useChatApi";
import IncomingCallModal from "../chat/IncomingCallModal";
import CallView from "../chat/CallView";

const ADMIN_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/crm", icon: ClipboardList, label: "CRM" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/employees", icon: UserCog, label: "Employees" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

const EMPLOYEE_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/crm/leads", icon: ClipboardList, label: "My Leads" },
  { to: "/crm/history", icon: History, label: "History" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

const SUPER_ADMIN_NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admins", icon: UserCog, label: "Admins" },
  { to: "/chat", icon: MessageCircle, label: "Chat" },
  { to: "/about", icon: BookOpen, label: "Overview" },
];

export default function Layout() {
  return (
    <CallProvider>
      <LayoutInner />
    </CallProvider>
  );
}

function LayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const role = getUserRole();
  const location = useLocation();
  const isChat = location.pathname.startsWith("/chat");
  const isCollapsed = isChat || manualCollapsed;
  const { unreadBadgeCount, hasIncomingCall } = useChatContext();
  const p2p = useCallContext();
  const { data: contacts = [] } = useContacts();
  const { data: roomPages } = useRooms();
  const rooms = useMemo(() => roomPages?.pages.flatMap((p) => p.rooms) ?? [], [roomPages]);

  // Resolve peer name from contacts or rooms (use p2p.peerId for both incoming & outgoing)
  const peerName = useMemo(() => {
    if (!p2p.peerId) return "Unknown";
    return (
      contacts.find((c) => c.id === p2p.peerId)?.name ||
      rooms.find((r) => r.other_user_id === p2p.peerId)?.other_name ||
      "Unknown"
    );
  }, [p2p.peerId, contacts, rooms]);

  const peerAvatarKey = useMemo(() => {
    if (!p2p.peerId) return undefined;
    return (
      contacts.find((c) => c.id === p2p.peerId)?.avatar_url ||
      rooms.find((r) => r.other_user_id === p2p.peerId)?.other_avatar_url ||
      undefined
    );
  }, [p2p.peerId, contacts, rooms]);

  const NAV = useMemo(() => {
    if (role === "employee") return EMPLOYEE_NAV;
    if (role === "super_admin") return SUPER_ADMIN_NAV;
    return ADMIN_NAV;
  }, [role]);

  // Dynamically build the mobile bottom navigation based on role
  const bottomNavItems = useMemo(() => {
    let items = NAV.slice(0, 5);
    // Replace "Overview" with "Profile" only for employees in the bottom nav
    if (role === "employee") {
      items = items.map((item) =>
        item.to === "/about"
          ? { to: "/profile", icon: User, label: "Profile" }
          : item
      );
    }
    return items;
  }, [NAV, role]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-black font-sans text-zinc-100"
      onScroll={(e) => { e.currentTarget.scrollTop = 0; }}
    >
      
      {/* Desktop Sidebar - Skeuomorphic Deep Black Chassis */}
      <aside 
        className={`hidden md:flex flex-col border-r border-white/5 bg-[#050505] transition-all duration-300 ease-in-out relative z-20 ${
          isChat ? "" : "shadow-[20px_0_40px_rgba(0,0,0,0.8)]"
        } ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Protruding Physical Toggle Button */}
        <button
          onClick={() => setManualCollapsed(!manualCollapsed)}
          className={`absolute -right-3.5 top-6 bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.8)] hover:bg-[#121214] text-zinc-400 hover:text-white p-1.5 rounded-full transition-all z-30 ${isChat ? "hidden" : ""}`}
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

        <nav className={`flex-1 px-3 space-y-1 ${isCollapsed ? "py-3" : "py-6 space-y-2 overflow-y-auto"}`} style={isCollapsed ? undefined : { scrollbarWidth: 'none' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => {
                // UI Magic: Detect if this is the Chat tab and it has unread messages
                const hasUnread = item.to === "/chat" && unreadBadgeCount > 0;
                
                return `relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 group ${
                  isCollapsed ? "justify-center p-2.5" : "px-4 py-3 gap-3.5"
                } ${
                  isActive
                    ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start" 
                    : hasUnread
                    // Highlighted State: Subtle glowing green tab if unread messages exist
                    ? "bg-accent-start/10 border border-accent-start/20 text-accent-start shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                    : "border border-transparent text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
                }`;
              }}
            >
              <div className="relative shrink-0">
                <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
                {item.to === "/chat" && hasIncomingCall && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-full animate-ping" />
                )}
                {item.to === "/chat" && hasIncomingCall && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050505]" />
                )}
                {item.to === "/chat" && !hasIncomingCall && unreadBadgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-orange-500 text-white text-[10px] font-black rounded-full border-2 border-[#050505] px-1">
                    {unreadBadgeCount > 99 ? "99+" : unreadBadgeCount}
                  </span>
                )}
              </div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              
              {isCollapsed && (
                <Tooltip label={item.label} side="right" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* External Website & Profile Section */}
        <div className="p-3 border-t border-white/5 bg-[#000000] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] space-y-2">
          
          <a
            href="https://www.brchub.tech"
            target="_blank"
            rel="noopener noreferrer"
            className={`relative flex items-center w-full rounded-xl text-sm font-bold transition-all duration-200 group border border-transparent text-cyan-500/80 hover:text-cyan-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] ${
              isCollapsed ? "justify-center p-2.5" : "px-4 py-3 gap-3.5"
            }`}
          >
            <Globe size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!isCollapsed && <span>BRC Hub Website</span>}
            {isCollapsed && (
              <Tooltip label="Visit brchub.tech" side="right" />
            )}
          </a>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `relative flex items-center w-full rounded-xl text-sm font-bold transition-all duration-200 group border border-transparent ${
                isActive
                  ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start"
                  : "border border-transparent text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
              } ${isCollapsed ? "justify-center p-2.5" : "px-4 py-3 gap-3.5"}`
            }
          >
            <User size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            {!isCollapsed && <span className="truncate">Profile</span>}
            {isCollapsed && <Tooltip label="Profile" side="right" />}
          </NavLink>
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
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
        />
        
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
                className={({ isActive }) => {
                  const hasUnread = item.to === "/chat" && unreadBadgeCount > 0;
                  return `flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start"
                      : hasUnread
                      ? "bg-accent-start/10 border border-accent-start/20 text-accent-start shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                      : "border border-transparent text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
                  }`;
                }}
              >
                <div className="relative">
                  <item.icon size={20} />
                  {item.to === "/chat" && hasIncomingCall && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-full animate-ping" />
                  )}
                  {item.to === "/chat" && hasIncomingCall && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#050505]" />
                  )}
                  {item.to === "/chat" && !hasIncomingCall && unreadBadgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-orange-500 text-white text-[10px] font-black rounded-full border-2 border-[#050505] px-1">
                      {unreadBadgeCount > 99 ? "99+" : unreadBadgeCount}
                    </span>
                  )}
                </div>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 bg-[#000000] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] space-y-2">
            <a
              href="https://www.brchub.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-transparent text-sm font-bold text-cyan-500/80 hover:text-cyan-400 hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] transition-all"
            >
              <Globe size={20} />
              BRC Hub Website
            </a>

            <NavLink
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-transparent text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#000000] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1),inset_0_0_4px_rgba(0,0,0,1)] text-accent-start"
                    : "text-zinc-400 hover:text-white hover:bg-[#09090b] hover:border-white/5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)]"
                }`
              }
            >
              <User size={20} />
              Profile
            </NavLink>
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-x-hidden relative bg-black pt-16 md:pt-0 pb-20 md:pb-0 ${isChat ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-start/5 blur-[150px] rounded-full pointer-events-none z-0" />
        <div className={`${isChat ? "h-full" : "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto"} relative z-10`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav - Protruding Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around px-2 pb-safe border-t border-white/5 bg-black/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => {
              const hasUnread = item.to === "/chat" && unreadBadgeCount > 0;
              return `flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-extrabold tracking-wide transition-all duration-200 ${
                isActive 
                  ? "text-accent-start -translate-y-1" 
                  : hasUnread
                  // Glowing green highlight for bottom nav when there's an unread message
                  ? "text-accent-start drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "text-zinc-600 hover:text-zinc-300"
              }`;
            }}
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

      {/* Global: 1:1 Incoming call modal */}
      {p2p.state === "ringing_in" && p2p.peerId && (
        <IncomingCallModal
          callerName={peerName}
          callerAvatarKey={peerAvatarKey}
          hasVideo={p2p.hasVideo}
          onAccept={p2p.accept}
          onReject={p2p.reject}
        />
      )}

      {/* Global: 1:1 Active call full-screen view */}
      {(p2p.state === "ringing_out" || p2p.state === "connecting" || p2p.state === "connected") && (
        <CallView call={p2p} peerName={peerName} peerAvatarKey={peerAvatarKey} />
      )}
    </div>
  );
}
