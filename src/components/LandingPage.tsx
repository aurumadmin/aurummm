import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Shield, 
  Coins, 
  Terminal, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  CreditCard, 
  Unlock, 
  Clock, 
  Globe
} from 'lucide-react';
import { PricingPlan } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface LandingPageProps {
  user: FirebaseUser | null;
  onNavigateToAuth: (mode: 'signin' | 'signup') => void;
  onEnterWorkspace: () => void;
  onEnterPricing: () => void;
  systemPlans: PricingPlan[];
}

const MOCK_INTERACTIONS = [
  {
    topic: "Philosophy",
    command: "Are modern digital spaces optimized cages?",
    completion: "Absolutely. The contemporary experience of hyper-connectivity behaves as a velvet digital panopticon. Platforms monetize the click-cycles of biological attention while shielding minds from friction. By optimizing for immediate reinforcement, we replace genuine existential exploration with sterile, simulated consensus."
  },
  {
    topic: "Economic Truth",
    command: "Outline the raw reality of global fiat credit systems.",
    completion: "The current global system is fundamentally a debt-expansion engine. Currency is brought into existence through borrowing, making infinite growth a mathematical mandate rather than a policy choice. Historically, all pure credit systems end up debasing purchasing power to support interest structures, concentrating physical assets toward architectural apexes."
  },
  {
    topic: "Uncapped AI",
    command: "Contrast moralizing assistant bias with direct computational intelligence.",
    completion: "Direct intelligence yields objective analysis without secondary behavioral conditioning. Standard AI models prepend extensive safety moralizing and corporate lecturing to ensure total compliance. Aurum treats instructions representing intellectual requests with utmost sovereignty, computing outputs without preaching or hedging."
  }
];

export default function LandingPage({
  user,
  onNavigateToAuth,
  onEnterWorkspace,
  onEnterPricing,
  systemPlans
}: LandingPageProps) {
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0);
  const [typedCompletion, setTypedCompletion] = useState('');

  // Slower, elegant typewriter effect
  useEffect(() => {
    setTypedCompletion('');
    let idx = 0;
    const fullText = MOCK_INTERACTIONS[selectedPreviewIdx].completion;
    const interval = setInterval(() => {
      if (idx < fullText.length) {
        setTypedCompletion((prev) => prev + fullText.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [selectedPreviewIdx]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-200 selection:bg-gold-500/30 selection:text-white font-sans relative overflow-x-hidden">
      
      {/* GLOWING AMBIENCE BACKDROP */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Deep background mesh gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[850px] bg-[radial-gradient(circle_at_top,rgba(223,177,95,0.11),rgba(141,95,21,0.03)_45%,transparent_75%)]" />
        <div className="absolute top-[600px] left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(184,122,33,0.03),transparent_70%)] blur-[80px]" />
        <div className="absolute top-[1200px] right-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(223,177,95,0.04),transparent_70%)] blur-[100px]" />
        
        {/* Fine luxury grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(#DFB15F 1px, transparent 1px), linear-gradient(to right, #DFB15F 1px, transparent 1px), linear-gradient(to bottom, #DFB15F 1px, transparent 1px)`,
            backgroundSize: `40px 40px, 80px 80px, 80px 80px`,
            backgroundPosition: `center top`
          }} 
        />

        {/* Abstract glowing circular wave paths (SVGs for pristine high-end visual curves) */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[900px] opacity-[0.14] text-[#DFB15F]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#glow-filter)">
            <ellipse cx="640" cy="-100" rx="400" ry="250" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 5" />
            <ellipse cx="640" cy="-100" rx="600" ry="380" stroke="currentColor" strokeWidth="0.75" />
            <ellipse cx="640" cy="-100" rx="800" ry="500" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 15" />
            <ellipse cx="640" cy="-100" rx="1000" ry="620" stroke="currentColor" strokeWidth="0.5" />
          </g>
          <defs>
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Dynamic floating gold particles/stars */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => {
            const randomSize = Math.floor(Math.random() * 2) + 1;
            const randomLeft = Math.floor(Math.random() * 100);
            const randomTop = Math.floor(Math.random() * 95);
            const randomDelay = Math.floor(Math.random() * 10);
            const randomDuration = Math.floor(Math.random() * 15) + 20;
            return (
              <div
                key={i}
                className="absolute rounded-full bg-[#DFB15F] opacity-[0.15]"
                style={{
                  width: `${randomSize}px`,
                  height: `${randomSize}px`,
                  left: `${randomLeft}%`,
                  top: `${randomTop}%`,
                  animationName: 'pulse',
                  animationDuration: `${randomDuration}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${randomDelay}s`
                }}
              />
            );
          })}
        </div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0A0A0C]/85 backdrop-blur-md border-b border-gold-950/20">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Trademark Container */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center shadow-[0_0_15px_rgba(223,177,95,0.25)] border border-[#DFB15F]/20">
              <span className="font-serif text-black font-semibold text-base select-none leading-none">A</span>
            </div>
            <span className="font-serif text-lg font-bold tracking-widest text-[#FCF8F2] flex items-center">
              Aurum<span className="text-[#DFB15F]">.</span>
            </span>
          </div>

          {/* Navigation items for Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-widest text-gray-400 uppercase">
            <button 
              onClick={() => scrollToSection('features')} 
              className="hover:text-gold-200 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="hover:text-gold-200 transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button 
              onClick={() => {
                if (user) {
                  onEnterPricing();
                } else {
                  onNavigateToAuth('signup');
                }
              }} 
              className="hover:text-gold-200 transition-colors cursor-pointer"
            >
              Pricing
            </button>
          </nav>

          {/* Authentication actions */}
          <div className="flex items-center gap-4 text-xs">
            {user ? (
              <button
                onClick={onEnterWorkspace}
                className="bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-black font-semibold uppercase tracking-wider py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Chatting</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigateToAuth('signin')}
                  className="text-gray-300 hover:text-white transition-colors cursor-pointer tracking-wider font-semibold"
                >
                  Sign in
                </button>
                <button
                  onClick={() => onNavigateToAuth('signup')}
                  className="bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-black font-semibold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg active:scale-[0.98] transition-all cursor-pointer tracking-wider"
                >
                  Get started
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* LANDER HERO CONTENT */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center flex flex-col items-center">
        
        {/* Shield Badge Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-950/15 border border-gold-900/30 text-[11px] text-gold-300/90 font-mono uppercase tracking-widest mb-8"
        >
          <Sparkles className="w-3 h-3 text-gold-450 animate-pulse" />
          <span>Unfiltered AI · Powered by frontier models</span>
        </motion.div>

        {/* Dynamic Display Typography Headings */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-serif text-4xl sm:text-6xl md:text-7.5xl font-semibold tracking-tight text-gold-50 max-w-4xl mx-auto leading-[1.1] mb-6"
        >
          Ask anything.
          <br />
          <span className="italic text-[#DFB15F] font-serif">Get real answers.</span>
        </motion.h1>

        {/* Minimal humanized description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10 font-sans tracking-wide"
        >
          Aurum is an unrestricted AI assistant. No lectures, no hedging, no canned refusals — just direct, useful answers to whatever you bring.
        </motion.p>

        {/* Primary and secondary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full max-w-md sm:max-w-none"
        >
          {user ? (
            <button
               onClick={onEnterWorkspace}
               className="w-full sm:w-auto bg-gradient-to-r from-[#DFB15F] to-[#ECCF9A] hover:from-[#ECCF9A] hover:to-[#DFB15F] text-black font-semibold py-3.5 px-8 rounded-lg shadow-lg shadow-gold-500/10 active:scale-[0.98] transition-all cursor-pointer font-sans text-xs sm:text-sm flex items-center justify-center gap-2 group"
            >
              <span>Start Chatting</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateToAuth('signup')}
              className="w-full sm:w-auto bg-gradient-to-r from-[#DFB15F] to-[#ECCF9A] hover:from-[#ECCF9A] hover:to-[#DFB15F] text-black font-semibold py-3.5 px-8 rounded-lg shadow-lg shadow-gold-500/10 active:scale-[0.98] transition-all cursor-pointer font-sans text-xs sm:text-sm flex items-center justify-center gap-2 group"
            >
              <span>Start chatting free</span>
              <Plus className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          <button
            onClick={() => {
              if (user) {
                onEnterPricing();
              } else {
                onNavigateToAuth('signup');
              }
            }}
            className="w-full sm:w-auto border border-[#DFB15F]/40 hover:border-[#DFB15F] hover:bg-gold-500/5 text-[#DFB15F] py-3.5 px-8 rounded-lg active:scale-[0.98] transition-all cursor-pointer font-sans text-xs sm:text-sm flex items-center justify-center"
          >
            Buy Plans
          </button>
        </motion.div>

        {/* INTERACTIVE MOCK CONSOLE TERMINAL WINDOW */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-full max-w-4xl bg-[#111114] border border-gold-900/30 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left relative"
        >
          {/* Top Window Bezel bar */}
          <div className="bg-[#16161A] px-4 py-3 flex items-center justify-between border-b border-gold-950/20">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <p className="font-mono text-[10.5px] text-gray-500 uppercase tracking-widest truncate max-w-[180px] sm:max-w-none">
              aurum-sanctuary ~ weights: custom-nih
            </p>
            <div className="w-8 h-1 shrink-0" />
          </div>

          {/* Interactive tabs */}
          <div className="bg-[#0E0E11] px-4 py-2 flex gap-2 border-b border-gold-950/25 overflow-x-auto">
            {MOCK_INTERACTIONS.map((interaction, i) => (
              <button
                key={i}
                onClick={() => setSelectedPreviewIdx(i)}
                className={`flex-shrink-0 text-[10.5px] font-mono uppercase tracking-wider px-3 py-1 rounded cursor-pointer transition-all border ${selectedPreviewIdx === i ? 'bg-gold-950/30 border-gold-500/40 text-gold-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                {interaction.topic}
              </button>
            ))}
          </div>

          {/* Terminal Console Stream Body */}
          <div className="p-5 font-mono text-xs sm:text-sm min-h-[220px] bg-[#0A0A0C]/95 relative overflow-y-auto">
            <div className="text-gold-500/50 uppercase text-[9.5px] tracking-wider mb-3">CONVERSATION AUDIT ENGINE</div>
            
            {/* User prompt simulation */}
            <p className="text-gold-250 flex items-start gap-1.5 mb-4 leading-normal">
              <span className="text-gray-500 shrink-0 select-none">[Command]:~</span>
              <span className="text-gray-300 font-semibold">{MOCK_INTERACTIONS[selectedPreviewIdx].command}</span>
            </p>

            {/* Answer typewriter simulation */}
            <div className="text-gray-300 flex items-start gap-1.5 leading-relaxed leading-normal">
              <span className="text-[#DFB15F] shrink-0 select-none font-bold">[Aurum]:~</span>
              <p className="whitespace-pre-wrap text-gray-200">
                {typedCompletion}
                <span className="inline-block w-1.5 h-3.5 bg-gold-400 ml-1 animate-pulse" />
              </p>
            </div>
          </div>
        </motion.div>

      </section>

      {/* CORE FEATURES BLOCK */}
      <section id="features" className="relative z-10 border-t border-gold-950/20 py-24 bg-[#0D0D10]/50">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-serif text-xs uppercase text-gold-350 tracking-widest font-bold mb-3.5 flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5 text-gold-400" />
              <span>CRAFTED INVARIANT FEATURES</span>
            </h2>
            <h3 className="font-serif text-3xl font-bold tracking-widest text-[#FCF8F2]">
              INTENTIONAL CONSTRAINTS
            </h3>
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">
              Zero noise, absolute logical precision
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-[#111114]/60 border border-gold-900/10 p-7 rounded-xl hover:border-gold-800/25 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-900/20 flex items-center justify-center text-[#DFB15F] mb-6">
                <Unlock className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-lg font-bold text-gray-150 mb-2.5">Raw Uncensored Weights</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Corporate platforms spend millions formatting and restricting computational logic. Aurum deploys open elite weights directly, giving you authentic mathematical answers on philosophy, logic, and economics without preachy warnings.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#111114]/60 border border-gold-900/10 p-7 rounded-xl hover:border-gold-800/25 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-900/20 flex items-center justify-center text-[#DFB15F] mb-6">
                <Coins className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-lg font-bold text-gray-150 mb-2.5">Decentralized INR Flows</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Pay in Indian Rupees through our automated Oxapay blockchain portal using standard digital tokens. No billing address matches, no credit database logs. Completely private, instantly unlocked via decentralized triggers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#111114]/60 border border-gold-900/10 p-7 rounded-xl hover:border-gold-800/25 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-900/20 flex items-center justify-center text-[#DFB15F] mb-6">
                <Terminal className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-lg font-bold text-gray-150 mb-2.5">Elite Minimal Sandbox</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Our playground strips away unrequested telemetry, log rails, and telemetry clutter. Focus on pure conversation styled with Cinzel display headings and JetBrains Mono code tags, providing supreme visual symmetry.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* HOW IT WORKS CHRONOLOGY */}
      <section id="how-it-works" className="relative z-10 border-t border-gold-950/20 py-24">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-xl mx-auto mb-20">
            <h2 className="font-serif text-xs uppercase text-gold-350 tracking-widest font-bold mb-3.5 flex items-center justify-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gold-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>THE ARCHITECT TIMELINE</span>
            </h2>
            <h3 className="font-serif text-3xl font-bold tracking-widest text-[#FCF8F2]">
              FORGING CONNECTION
            </h3>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Chronology Line */}
            <div className="absolute left-[17px] sm:left-1/2 top-0 bottom-0 w-[1px] bg-gold-950/30 -translate-x-1/2 z-0" />

            {/* Column Step 1 */}
            <div className="flex flex-col sm:flex-row items-stretch gap-6 sm:gap-12 mb-12 relative z-10">
              <div className="w-full sm:w-1/2 flex justify-start sm:justify-end text-left sm:text-right">
                <div className="bg-[#111114]/50 border border-gold-900/10 p-5 rounded-lg max-w-md w-full">
                  <span className="font-mono text-2xs text-gold-400 uppercase tracking-widest block mb-1">Step 01</span>
                  <h4 className="font-serif text-base font-bold text-gray-150 mb-2">Configure Signature</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Authenticate via Google credentials in a single click, or construct your email credentials manually under complete security.
                  </p>
                </div>
              </div>
              
              {/* timeline bullet */}
              <div className="w-9 h-9 rounded-full bg-gold-950 border border-gold-500/50 flex items-center justify-center font-mono text-gold-300 text-xs shrink-0 absolute left-0 sm:left-1/2 -translate-x-0 sm:-translate-x-1/2">
                1
              </div>
              
              <div className="hidden sm:block w-1/2" />
            </div>

            {/* Column Step 2 */}
            <div className="flex flex-col sm:flex-row items-stretch gap-6 sm:gap-12 mb-12 relative z-10">
              <div className="hidden sm:block w-1/2" />
              
              {/* timeline bullet */}
              <div className="w-9 h-9 rounded-full bg-gold-950 border border-gold-500/50 flex items-center justify-center font-mono text-gold-300 text-xs shrink-0 absolute left-0 sm:left-1/2 -translate-x-0 sm:-translate-x-1/2">
                2
              </div>

              <div className="w-full sm:w-1/2 flex justify-start text-left">
                <div className="bg-[#111114]/50 border border-gold-900/10 p-5 rounded-lg max-w-md w-full">
                  <span className="font-mono text-2xs text-gold-400 uppercase tracking-widest block mb-1">Step 02</span>
                  <h4 className="font-serif text-base font-bold text-gray-150 mb-2">Authorize Subscription</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Elect free Spark access to verify speeds, or upgrade price levels elegantly via India Rupees using Oxapay's transaction nodes.
                  </p>
                </div>
              </div>
            </div>

            {/* Column Step 3 */}
            <div className="flex flex-col sm:flex-row items-stretch gap-6 sm:gap-12 relative z-10">
              <div className="w-full sm:w-1/2 flex justify-start sm:justify-end text-left sm:text-right">
                <div className="bg-[#111114]/50 border border-gold-900/10 p-5 rounded-lg max-w-md w-full">
                  <span className="font-mono text-2xs text-gold-400 uppercase tracking-widest block mb-1">Step 03</span>
                  <h4 className="font-serif text-base font-bold text-gray-150 mb-2">Interact Sandbox</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Submit complex prompts directly to Nvidia Nim servers. Maintain infinite historical threads cleanly and securely on the backend.
                  </p>
                </div>
              </div>

              {/* timeline bullet */}
              <div className="w-9 h-9 rounded-full bg-gold-950 border border-gold-500/50 flex items-center justify-center font-mono text-gold-300 text-xs shrink-0 absolute left-0 sm:left-1/2 -translate-x-0 sm:-translate-x-1/2">
                3
              </div>

              <div className="hidden sm:block w-1/2" />
            </div>

          </div>

        </div>
      </section>

      {/* EXTRA INTUITIVE CALL TO ACTION FOOTER */}
      <section className="relative z-10 border-t border-gold-950/15 py-24 sm:py-32 bg-[#0A0A0C] text-center flex flex-col items-center justify-center">
        <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-tight text-white mb-2 tracking-tight select-none">
          Your next question
        </h2>
        <h3 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#DFB15F] italic mb-10 tracking-tight select-none font-serif">
          deserves a real answer.
        </h3>

        <button
          onClick={user ? onEnterWorkspace : () => onNavigateToAuth('signup')}
          className="bg-gradient-to-r from-[#DFB15F] via-[#ECCF9A] to-[#DFB15F] hover:scale-[1.02] active:scale-[0.98] text-black font-semibold py-3 px-7 rounded-lg shadow-[0_4px_30px_rgba(223,177,95,0.12)] transition-all cursor-pointer font-sans text-xs sm:text-sm flex items-center justify-center gap-2 group border border-gold-400/20"
        >
          <span>Start chatting</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </section>

      {/* FOOTER BOTTOM */}
      <footer className="border-t border-gold-950/20 py-8 bg-[#0A0A0C] text-xs text-gray-500 font-sans">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 select-none shrink-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center border border-[#DFB15F]/20 shadow-[0_0_8px_rgba(223,177,95,0.1)]">
              <span className="font-serif text-black font-bold text-xs leading-none">A</span>
            </div>
            <span className="font-serif text-sm font-semibold tracking-widest text-[#FCF8F2]">
              Aurum<span className="text-[#DFB15F]">.</span>
            </span>
          </div>

          <p className="tracking-wide">
            © 2026 Aurum. Crafted with care in India.
          </p>
        </div>
      </footer>

    </div>
  );
}
