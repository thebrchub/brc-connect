import { useState } from "react";
import { useAvatarUrl } from "./useChatApi";

interface Props {
  name?: string;
  avatarKey?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-xl",
};

export default function Avatar({ name, avatarKey, size = "md", className = "" }: Props) {
  const { data: avatarUrl } = useAvatarUrl(avatarKey);
  const [imgError, setImgError] = useState(false);
  const initial = (name || "?").charAt(0).toUpperCase();
  const sizeClass = sizeMap[size];

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || "avatar"}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold shrink-0 bg-accent-start/15 text-accent-start ${className}`}
    >
      {initial}
    </div>
  );
}
