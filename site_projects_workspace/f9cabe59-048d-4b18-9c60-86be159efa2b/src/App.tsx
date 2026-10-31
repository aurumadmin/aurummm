import React, { useState } from 'react';
import { defaultBirthdayConfig } from './BirthdayConfig';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import BirthdayMessage from './components/BirthdayMessage';
import MemoriesGallery from './components/MemoriesGallery';
import StoryTimeline from './components/StoryTimeline';
import ReasonsAwesome from './components/ReasonsAwesome';
import InteractiveGiftBox from './components/InteractiveGiftBox';
import CountdownTimer from './components/CountdownTimer';
import FinalSection from './components/FinalSection';
import ConfettiCanvas from './components/ConfettiCanvas';

export default function App() {
  const [config] = useState(defaultBirthdayConfig);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  const handleBurst = () => {
    setTriggerConfetti(true);
  };

  const handleReplay = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTriggerConfetti(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-pink-500 selection:text-slate-950 relative overflow-x-hidden">
      <ConfettiCanvas
        triggerBurst={triggerConfetti}
        onBurstComplete={() => setTriggerConfetti(false)}
      />

      <Navbar
        name={config.name}
        onTriggerConfetti={handleBurst}
      />

      <main className="space-y-12">
        <HeroSection
          name={config.name}
          onStartCelebration={handleBurst}
        />

        <BirthdayMessage
          title={config.messageTitle}
          message={config.messageContent}
          name={config.name}
        />

        <MemoriesGallery photos={config.photos} />

        <StoryTimeline milestones={config.milestones} />

        <ReasonsAwesome reasons={config.reasons} />

        <InteractiveGiftBox
          title={config.surpriseTitle}
          message={config.surpriseMessage}
          onOpenGift={handleBurst}
        />

        <CountdownTimer targetDateStr={config.birthdayDate} />

        <FinalSection
          name={config.name}
          onReplayMagic={handleReplay}
        />
      </main>

      <footer className="border-t border-purple-900/30 bg-slate-950/90 py-8 text-center text-xs text-purple-300/60">
        <p>© 2026 Crafted with ❤️ for {config.name}'s Birthday Celebration</p>
      </footer>
    </div>
  );
}
