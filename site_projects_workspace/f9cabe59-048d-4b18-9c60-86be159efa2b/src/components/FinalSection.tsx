import React from 'react';
import { RotateCcw, Sparkles, Heart } from 'lucide-react';

interface FinalSectionProps {
  name: string;
  onReplayMagic: () => void;
}

export default function FinalSection({ name, onReplayMagic }: FinalSectionProps) {
  return (
    <section className="py-24 px-6 text-center space-y-8 bg-gradient-to-t from-purple-950/60 via-slate-950 to-slate-950 relative overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
          <Heart className="w-8 h-8 fill-pink-500 stroke-none animate-pulse" />
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Here's to another year of amazing memories. 🥂
        </h2>

        <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
          Happy Birthday, {name}! ❤️✨
        </p>

        <div className="pt-6">
          <button
            onClick={onReplayMagic}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-purple-500/40 hover:border-pink-500 text-slate-100 font-bold px-8 py-4 rounded-2xl text-sm shadow-2xl transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-pink-400" />
            <span>Replay the Magic ✨</span>
          </button>
        </div>
      </div>
    </section>
  );
}
