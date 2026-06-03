import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CustomDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  align?: "left" | "right";
  size?: "md" | "sm";
  openDirection?: "top" | "bottom";
}

export default function CustomDropdown({ 
  value, 
  options, 
  onChange, 
  placeholder = "Select...", 
  align = "left",
  size = "md",
  openDirection = "bottom"
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="relative inline-block text-left w-full sm:w-auto">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
        // Skeuomorphic Recessed Button
        className={`flex items-center justify-between w-full min-w-[130px] rounded-xl border border-white/5 bg-[#09090b] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] text-zinc-300 hover:text-accent-start focus:border-accent-start/50 transition-colors outline-none ${
          size === "sm" ? "px-3 py-1.5 text-xs font-bold" : "px-4 py-3 text-sm font-bold"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={size === "sm" ? 14 : 16} className={`ml-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-accent-start" : "text-zinc-500"}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          
          <div className={`absolute ${align === "right" ? "right-0" : "left-0"} ${openDirection === "top" ? "bottom-full mb-2" : "top-full mt-2"} min-w-[140px] rounded-2xl border border-white/5 border-t-white/10 bg-gradient-to-b from-[#18181b] to-[#09090b] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.6)] z-50 py-2 animate-in fade-in ${openDirection === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"} duration-200`}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center px-4 py-2 transition-colors font-semibold ${size === "sm" ? "text-xs" : "text-sm"} ${
                  value === opt.value
                    ? "bg-accent-start/10 text-accent-start border-l-2 border-accent-start"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
