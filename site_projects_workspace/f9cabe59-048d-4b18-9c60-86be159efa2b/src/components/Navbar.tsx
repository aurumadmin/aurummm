import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';

interface NavbarProps {
  name: string;
  onTriggerConfetti: () => void;
}

export default function Navbar({ name, onTriggerConfetti }: NavbarProps) {
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const toggleMusic = () => {
    setIsPlayingMusic(!isPlayingMusic);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/75 backdrop-blur-xl border-b border-purple-900/30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl transition-all">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-[1px] shadow-lg shadow-purple-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center font-bold text-pink-400">
            <Heart className="w-4 h-4 fill-pink-500 stroke-none animate-pulse" />
          </div>
        </div>
        <span className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-pink-300 via-purple-200 to-amber-200 bg-clip-text text-transparent tracking-tight">
          Happy Birthday, {name}!
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-purple-200/80">
        <button onClick={() => scrollToSection('message')} className="hover:text-pink-300 transition-colors cursor-pointer">Message</button>
        <button onClick={() => scrollToSection('memories')} className="hover:text-pink-300 transition-colors cursor-pointer">Memories</button>
        <button onClick={() => scrollToSection('story')} className="hover:text-pink-300 transition-colors cursor-pointer">Our Story</button>
        <button onClick={() => scrollToSection('reasons')} className="hover:text-pink-300 transition-colors cursor-pointer">Reasons</button>
        <button onClick={() => scrollToSection('gift')} className="hover:text-pink-300 transition-colors cursor-pointer">Surprise Gift</button>
        <button onClick={() => scrollToSection('countdown')} className="hover:text-pink-300 transition-colors cursor-pointer">Countdown</button>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleMusic}
          title={isPlayingMusic ? "Pause Music" : "Play Birthday Tune"}
          className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isPlayingMusic 
              ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-lg shadow-pink-500/20' 
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-purple-500/40'
          }`}
        >
          {isPlayingMusic ? <Volume2 className="w-3.5 h-3.5 animate-bounce text-pink-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          <span className="hidden sm:inline">{isPlayingMusic ? "Playing Tune 🎵" : "Music"}</span>
        </button>

        <button
          onClick={onTriggerConfetti}
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>Celebrate! 🎉</span>
        </button>
      </div>
    </header>
  );
}
