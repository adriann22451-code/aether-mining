import {
  ChevronLeft,
} from "lucide-react";

export function ScreenHeader({ title, onBack }) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-[15px] font-extrabold tracking-[0.15em] text-white">{title}</span>
      <div className="w-9 h-9" />
    </div>
  );
}
