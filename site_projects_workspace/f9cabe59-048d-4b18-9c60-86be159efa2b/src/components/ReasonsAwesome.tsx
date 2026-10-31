import React from 'react';
import { ReasonCard } from '../types';
import { Heart, Star } from 'lucide-react';

interface ReasonsAwesomeProps {
  reasons: ReasonCard[];
}

export default function ReasonsAwesome({ reasons }: ReasonsAwesomeProps) {
  return (
    <section id="reasons" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
          <span>Appreciation Spotlight</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Reasons You're Awesome 💜
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reasons.map((r) => (
          <div
            key={r.id}
            className="group relative bg-slate-900/80 border border-slate-800 hover:border-pink-500/50 rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 shadow-xl hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform">
                {r.emoji}
              </span>
              <h3 className="font-extrabold text-base text-white">{r.title}</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {r.description}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end text-[11px] text-pink-400 font-semibold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Star className="w-3 h-3 fill-pink-400 stroke-none" />
              <span>Fact Check: 100% True</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
