import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth } from '../lib/auth';
import { Sparkles, ArrowLeft, Mail, Lock, User, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface AuthPageProps {
  onBackToHome: () => void;
  onSuccess: () => void;
  preferredTab?: 'signin' | 'signup';
}

export default function AuthPage({
  onBackToHome,
  onSuccess,
  preferredTab = 'signin'
}: AuthPageProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(preferredTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (authMode === 'signup') {
        if (!name.trim()) {
          throw new Error("Full display name is required for account creation.");
        }
        if (password.length < 6) {
          throw new Error("Private security key (password) must be at least 6 characters.");
        }

        // Register user on VPS local database
        await auth.register(email.trim(), password, name.trim());
        onSuccess();
      } else {
        // Sign In on VPS local database
        await auth.login(email.trim(), password);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Credential auth failure:', err);
      setErrorMsg(err.message || 'Authorization failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-gray-200">
      
      {/* Decorative corner lines simulating goldsmith precision */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-gold-850/20" />
      <div className="absolute top-10 right-10 w-20 h-20 border-t border-r border-gold-850/20" />
      <div className="absolute bottom-10 left-10 w-20 h-20 border-b border-l border-gold-850/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-gold-850/20" />

      {/* Background glow shadow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,122,33,0.05),transparent_60%)] pointer-events-none" />

      {/* Top Left back action */}
      <button
        onClick={onBackToHome}
        className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-gold-300 transition-colors cursor-pointer z-20 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Return to lander</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-md text-center bg-[#111114] border border-gold-900/30 p-6 sm:p-8 rounded-xl shadow-[0_15px_45px_rgba(0,0,0,0.7)] relative z-10"
      >
        {/* Golden Logo Sphere */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#DFB15F] via-[#E9C37A] to-[#B3873B] flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(223,177,95,0.3)] border border-[#DFB15F]/20 select-none">
          <span className="font-serif text-black font-bold text-2xl select-none leading-none">A</span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-[#FCF8F2] mb-1">
          {authMode === 'signin' ? 'AUTHORIZE ACCESS' : 'CREATE SIGNATURE'}
        </h1>
        <p className="text-[10px] sm:text-xs text-gray-400 font-sans tracking-wide max-w-xs mx-auto mb-6 leading-relaxed">
          {authMode === 'signin' 
            ? 'Access your computational workspace and historical discussions.' 
            : 'Initialize your free Aurum Spark account with VPS storage.'
          }
        </p>

        {/* Tab Selection Switch */}
        <div className="flex bg-[#0A0A0C] p-1 rounded-lg mb-6 border border-gold-950/20">
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md uppercase tracking-wider cursor-pointer transition-all ${authMode === 'signin' ? 'bg-[#111114] border border-gold-900/25 text-gold-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md uppercase tracking-wider cursor-pointer transition-all ${authMode === 'signup' ? 'bg-[#111114] border border-gold-900/25 text-gold-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Register
          </button>
        </div>

        {/* Custom status logs inside */}
        {errorMsg && (
          <div className="mb-4 bg-red-950/30 border border-red-900/40 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <p className="flex-1 leading-normal font-sans">{errorMsg}</p>
          </div>
        )}

        {/* Email Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {authMode === 'signup' && (
            <div>
              <label className="block text-[10px] font-mono uppercase text-gold-400/70 tracking-widest mb-1.5">
                Full Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sovereign Seeker"
                  className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase text-gold-400/70 tracking-widest mb-1.5">
              Email Address / Key
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seeker@aurum.org"
                className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-gold-400/70 tracking-widest mb-1.5">
              Private Security Key (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#0A0A0C] border border-gold-900/20 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-[#DFB15F] hover:bg-gold-400 text-black font-semibold py-2.5 px-4 rounded-lg cursor-pointer select-none border-t border-gold-300/20 active:scale-[0.98] transition-all font-sans text-xs uppercase tracking-wider"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <span>{authMode === 'signup' ? 'Create Account' : 'Authorize Signature'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gold-900/10 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-500/70" />
          <span>Self-Hosted Encrypted Vault (VPS Storage)</span>
        </div>

      </motion.div>
    </div>
  );
}
