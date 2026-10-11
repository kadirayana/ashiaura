import type { OlfactoryNotes } from "@/data/products";
import { Sparkles, Heart, Anchor } from "lucide-react";

interface NotesPyramidProps {
  notes: OlfactoryNotes;
  compact?: boolean;
}

export function NotesPyramid({ notes, compact = false }: NotesPyramidProps) {
  if (compact) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium w-12">Üst:</span>
          <span className="text-zinc-300">{notes.top.join(", ")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium w-12">Kalp:</span>
          <span className="text-zinc-300">{notes.heart.join(", ")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium w-12">Dip:</span>
          <span className="text-zinc-300">{notes.base.join(", ")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Üst Notalar */}
      <div className="p-4 rounded-none bg-white/[0.02] border border-white/5 hover:border-[#c5a880]/30 transition-colors">
        <div className="flex items-center gap-2 text-[#c5a880] text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Üst Notalar (Açılış • İlk 15-30 Dk)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {notes.top.map((note) => (
            <span
              key={note}
              className="text-xs px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/10"
            >
              {note}
            </span>
          ))}
        </div>
      </div>

      {/* Kalp Notaları */}
      <div className="p-4 rounded-none bg-white/[0.02] border border-white/5 hover:border-[#c5a880]/30 transition-colors">
        <div className="flex items-center gap-2 text-[#c5a880] text-xs font-semibold uppercase tracking-wider mb-2">
          <Heart className="w-3.5 h-3.5" />
          <span>Kalp Notaları (Parfümün Ruhu • 2 - 6 Saat)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {notes.heart.map((note) => (
            <span
              key={note}
              className="text-xs px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/10"
            >
              {note}
            </span>
          ))}
        </div>
      </div>

      {/* Dip Notalar */}
      <div className="p-4 rounded-none bg-white/[0.02] border border-white/5 hover:border-[#c5a880]/30 transition-colors">
        <div className="flex items-center gap-2 text-[#c5a880] text-xs font-semibold uppercase tracking-wider mb-2">
          <Anchor className="w-3.5 h-3.5" />
          <span>Dip Notalar (Kalıcı İz • 14+ Saat)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {notes.base.map((note) => (
            <span
              key={note}
              className="text-xs px-2.5 py-1 bg-white/5 text-zinc-200 border border-white/10"
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
