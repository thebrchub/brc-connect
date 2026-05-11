import { useState, useRef } from "react";
import { Camera, Loader2, ArrowLeft } from "lucide-react";
import { useProfile, useUpdateProfile, useUploadAvatar, useAvatarUrl } from "../chat/useChatApi";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();
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
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={profile.name}
              onError={() => setImgError(true)}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent-start/15 text-accent-start flex items-center justify-center text-3xl font-bold">
              {initial}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent-start flex items-center justify-center text-white shadow-lg hover:bg-accent-start/80 transition-colors"
          >
            {uploadAvatar.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
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
      </div>

      {/* Profile info */}
      <div className="space-y-4">
        {/* Name */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Name</label>
          {nameEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent-start/30"
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              />
              <button
                onClick={handleNameSave}
                disabled={updateProfile.isPending}
                className="px-3 py-1.5 rounded-lg bg-accent-start/20 text-accent-start text-sm hover:bg-accent-start/30 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setNameEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 text-sm hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p
              className="text-white text-sm mt-1 cursor-pointer hover:text-accent-start transition-colors"
              onClick={() => { setName(profile.name); setNameEditing(true); }}
            >
              {profile.name}
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Email</label>
          <p className="text-white text-sm mt-1">{profile.email}</p>
        </div>

        {/* Role (read-only) */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Role</label>
          <p className="text-white text-sm mt-1 capitalize">{profile.role.replace("_", " ")}</p>
        </div>


      </div>
    </div>
  );
}
