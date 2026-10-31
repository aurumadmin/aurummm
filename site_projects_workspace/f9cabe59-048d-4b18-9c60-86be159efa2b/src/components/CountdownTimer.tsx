import React, { useState, useEffect } from 'react';
import { Timer, Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDateStr: string;
}

export default function CountdownTimer({ targetDateStr }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      let target = new Date(targetDateStr);
      if (isNaN(target.getTime())) {
        target = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      }
      if (target.getTime() < now.getTime()) {
        target.setFullYear(now.getFullYear() + 1);
      }

      const diff = target.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  return (
    <section id="countdown" className="py-20 px-6 max-w-4xl mx-auto text-center space-y-10">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span>Live Birthday Tracker</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Until Your Next Birthday 🎂
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
        {[
          { label: 'Days', value: timeLeft.days },
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Minutes', value: timeLeft.minutes },
          { label: 'Seconds', value: timeLeft.seconds }
        ].map((unit, idx) => (
          <div
            key={idx}
            className="p-6 bg-slate-900/80 border border-purple-500/30 rounded-2xl backdrop-blur-xl shadow-xl space-y-1"
          >
            <div className="text-4xl sm:text-5xl font-extrabold font-mono bg-gradient-to-r from-pink-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
              {String(unit.value).padStart(2, '0')}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
