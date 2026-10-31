import React from 'react';
import { Mail, Heart, Sparkles } from 'lucide-react';

interface BirthdayMessageProps {
  title: string;
  message: string;
  name: string;
}

export default function BirthdayMessage({ title, message, name }: BirthdayMessageProps) {
  return (
    <section id="message" className="py-20 px-6 max-w-4xl mx-auto relative">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
          <Mail className="w-3.5 h-3.5 text-pink-400" />
          <span>Heartfelt Note</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {title}
        </h2>
      </div>

      {/* Glassmorphism Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-amber-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
        <div className="relative bg-slate-900/80 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6 text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 font-mono text-xs text-pink-400">
              <Sparkles className="w-4 h-4" />
              <span>CONFIDENTIAL // FOR {name.toUpperCase()} ONLY</span>
            </div>
            <Heart className="w-5 h-5 fill-pink-500 stroke-none animate-pulse" />
          </div>

          <p className="text-base sm:text-xl text-slate-200 leading-relaxed font-serif italic">
            "{message}"
          </p>

          <div className="pt-4 flex items-center justify-between text-xs text-purple-300/70 font-semibold border-t border-slate-800/80">
            <span>With love & joy,</span>
            <span className="font-extrabold text-pink-300">Forever Your Best Friends ❤️</span>
          </div>
        </div>
      </div>
    </section>
  );
}
