import React, { useState } from 'react';
import { Gift, Sparkles, PartyPopper, CheckCircle } from 'lucide-react';

interface InteractiveGiftBoxProps {
  title: string;
  message: string;
  onOpenGift: () => void;
}

export default function InteractiveGiftBox({ title, message, onOpenGift }: InteractiveGiftBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleBoxClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      onOpenGift();
    }
  };

  return (
    <section id="gift" className="py-20 px-6 max-w-4xl mx-auto text-center space-y-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Mystery</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          There's One More Thing... 🎁
        </h2>
        <p className="text-sm text-purple-200/70">
          Tap the gift box below to unwrap your special birthday surprise!
        </p>
      </div>

      <div className="flex justify-center">
        {!isOpen ? (
          <div
            onClick={handleBoxClick}
            className="group relative cursor-pointer p-8 bg-slate-900/90 border border-pink-500/40 rounded-3xl shadow-2xl backdrop-blur-xl hover:scale-105 transition-all duration-300 max-w-md w-full space-y-6"
          >
            <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 to-amber-500 rounded-3xl blur-lg opacity-40 group-hover:opacity-80 transition-opacity animate-pulse" />
            
            <div className="relative space-y-4">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 p-[2px] shadow-xl">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Gift className="w-12 h-12 text-amber-400 animate-bounce" />
                </div>
              </div>
              <h3 className="font-extrabold text-lg text-white">Unwrap Birthday Box</h3>
              <p className="text-xs text-purple-200/80 font-mono">CLICK TO OPEN 🎁</p>
            </div>
          </div>
        ) : (
          <div className="relative p-8 sm:p-12 bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl backdrop-blur-2xl max-w-2xl w-full space-y-6 text-left animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
                <PartyPopper className="w-6 h-6 animate-spin" />
                <span>{title}</span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                UNLOCKED 🎉
              </span>
            </div>

            <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
              {message}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Claimed with Birthday Privilege</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
