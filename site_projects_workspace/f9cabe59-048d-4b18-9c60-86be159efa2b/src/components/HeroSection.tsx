import React from 'react';
import { Sparkles, Gift, ArrowDown, Heart } from 'lucide-react';

interface HeroSectionProps {
  name: string;
  onStartCelebration: () => void;
}

export default function HeroSection({ name, onStartCelebration }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950">
      {/* Background ambient glowing soft radial blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-inner shadow-purple-500/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>The Birthday VIP Experience</span>
        </div>

        {/* Main Hero Headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight leading-[1.15]">
          Happy Birthday, <br />
          <span className="bg-gradient-to-r from-pink-400 via-purple-300 to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
            {name} 🎂✨
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-purple-200/80 max-w-xl mx-auto font-medium leading-relaxed">
          “Today isn't just another day... it's YOUR day.”
        </p>

        {/* Floating Glowing Cake/Gift Center Piece */}
        <div className="py-6 flex justify-center">
          <div className="relative group cursor-pointer" onClick={onStartCelebration}>
            <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900/90 border border-pink-500/40 backdrop-blur-xl flex flex-col items-center justify-center gap-2 shadow-2xl transition-transform duration-300 group-hover:scale-105">
              <Gift className="w-12 h-12 text-pink-400 animate-bounce" />
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                <Heart className="w-3 h-3 fill-amber-300 stroke-none" />
                <span>Tap for Magic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onStartCelebration}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-5 h-5 fill-slate-950" />
            <span>Start the Celebration ✨</span>
          </button>
        </div>
      </div>

      {/* Down Scroll Arrow */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 text-xs font-mono">
        <span>Scroll to Explore</span>
        <ArrowDown className="w-4 h-4 animate-bounce text-pink-400/80" />
      </div>
    </section>
  );
}
