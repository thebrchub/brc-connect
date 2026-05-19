import { useState, useRef } from "react";
import { Camera, Loader2, ArrowLeft, LogOut } from "lucide-react";
import { useProfile, useUpdateProfile, useUploadAvatar, useAvatarUrl } from "../chat/useChatApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // Added useAuth for logout

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // Destructure logout
  const { data: profile, isLoading } = useProfile();
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_url);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-accent-start" size={32} />
      </div>
    );
  }
  if (!profile) return null;

  const initial = profile.name.charAt(0).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB)");
      return;
    }
    uploadAvatar.mutate(file);
    e.target.value = "";
  };

  const handleNameSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== profile.name) {
      updateProfile.mutate({ name: trimmed });
    }
    setNameEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {/* Skeuomorphic Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#121214] transition-all active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] active:bg-black"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-none">
            Profile Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5 font-medium">Manage your personal information and account</p>
        </div>
      </div>

      {/* Main Skeuomorphic Card - Widened to max-w-4xl */}
      <div className="rounded-3xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-start/5 blur-[100px] rounded-full pointer-events-none" />

        {/* 2-Column Layout to fix white space */}
        <div className="relative z-10 flex flex-col md:flex-row gap-12 md:gap-16 items-start">
          
          {/* Left Column: Avatar & Role */}
          <div className="flex flex-col items-center w-full md:w-auto shrink-0 space-y-6">
            <div className="relative group">
              {/* Outer Ring for Premium Look */}
              <div className="p-1.5 rounded-full bg-[#09090b] border border-white/5 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.02),0_8px_16px_rgba(0,0,0,0.8)]">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={profile.name}
                    onError={() => setImgError(true)}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-inner"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-accent-start/10 border border-accent-start/20 text-accent-start flex items-center justify-center text-5xl font-black shadow-inner">
                    {initial}
                  </div>
                )}
              </div>
              
              {/* Upload Button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-gradient-to-r from-accent-start to-accent-end flex items-center justify-center text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_8px_rgba(52,211,153,0.4)] hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} className="drop-shadow-sm" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Role Badge shifted under avatar for balance */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] text-sm font-bold text-zinc-300 capitalize">
              <span className="w-2 h-2 rounded-full bg-accent-start shadow-[0_0_5px_rgba(52,211,153,0.5)]"></span>
              {profile.role.replace("_", " ")}
            </div>
          </div>

          {/* Right Column: Profile Info & Actions */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Name Field */}
            <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-2xl p-5 md:p-6">
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-2 block">
                Full Name
              </label>
              {nameEditing ? (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="flex-1 rounded-xl border border-white/10 bg-[#121214] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-accent-start/50 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleNameSave}
                      disabled={updateProfile.isPending}
                      className="px-4 py-2.5 rounded-xl bg-accent-start/10 text-accent-start border border-accent-start/20 text-sm font-bold hover:bg-accent-start/20 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setNameEditing(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-zinc-400 border border-white/5 text-sm font-bold hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => { setName(profile.name); setNameEditing(true); }}
                >
                  <p className="text-white text-lg font-bold group-hover:text-accent-start transition-colors">
                    {profile.name}
                  </p>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider group-hover:text-accent-start/60 transition-colors">
                    Click to Edit
                  </span>
                </div>
              )}
            </div>

            {/* Email Field (Read-only) */}
            <div className="bg-[#09090b] border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-2xl p-5 md:p-6">
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-1 block">
                Email Address
              </label>
              <p className="text-zinc-300 text-base font-bold">
                {profile.email}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

            {/* Danger Zone: Logout Action */}
            <div>
              <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-3 block">
                Account Actions
              </label>
              <button
                onClick={logout}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#09090b] border border-red-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_8px_rgba(0,0,0,0.4)] text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200"
              >
                <LogOut size={18} />
                Sign Out of Account
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}