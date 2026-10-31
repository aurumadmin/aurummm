import React from 'react';
import { MemoryMilestone } from '../types';
import { Sparkles, Laugh, Compass, Heart, Calendar } from 'lucide-react';

interface StoryTimelineProps {
  milestones: MemoryMilestone[];
}

export default function StoryTimeline({ milestones }: StoryTimelineProps) {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Laugh': return <Laugh className="w-5 h-5 text-amber-400" />;
      case 'Compass': return <Compass className="w-5 h-5 text-emerald-400" />;
      case 'Heart': return <Heart className="w-5 h-5 text-pink-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <section id="story" className="py-20 px-6 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Journey</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Our Story ✨
        </h2>
      </div>

      <div className="relative border-l-2 border-purple-500/30 ml-4 sm:ml-32 space-y-10 pl-6 sm:pl-10">
        {milestones.map((m) => (
          <div key={m.id} className="relative group">
            {/* Timeline Dot Icon */}
            <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 w-10 h-10 rounded-2xl bg-slate-900 border border-purple-500/40 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-pink-500 transition-all">
              {getIcon(m.icon)}
            </div>

            {/* Date Tag on Desktop */}
            <div className="hidden sm:block absolute -left-36 top-3 text-right text-xs font-mono font-bold text-purple-300">
              {m.date}
            </div>

            {/* Content Card */}
            <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-6 space-y-2 backdrop-blur-xl transition-all shadow-xl">
              <div className="flex items-center justify-between">
                <span className="sm:hidden text-xs font-mono font-bold text-purple-300">{m.date}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  {m.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{m.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{m.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
