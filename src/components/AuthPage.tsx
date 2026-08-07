import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Sparkles, ArrowLeft, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthPageProps {
  onBackToHome: () => void;
  onSuccess: () => void;
  handleGoogleSignIn: () => Promise<void>;
  preferredTab?: 'signin' | 'signup';
}

export default function AuthPage({
  onBackToHome,
  onSuccess,
  handleGoogleSignIn,
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
          throw new Error("Name field is required for registry synthesis.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        // Create Firebase credentials
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // Update user display profile
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });

        // Initialize corresponding User profile in Firestore
        const profileRef = doc(db, 'users', userCredential.user.uid);
        const newProfile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: name.trim(),
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
          planId: 'plan_free',
          planName: 'Free',
          queriesCount: 0,
          createdAt: serverTimestamp(),
          planExpiresAt: null
        };
        await setDoc(profileRef, newProfile);
        onSuccess();
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Credential auth failure:', err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/weak-password') friendlyMessage = 'The password must contain at least 6 characters.';
      if (err.code === 'auth/email-already-in-use') friendlyMessage = 'An account with this email already exists.';
      if (err.code === 'auth/invalid-credential') friendlyMessage = 'Incorrect credentials. Please verify your email and password.';
      if (err.code === 'auth/invalid-email') friendlyMessage = 'Please enter a valid email format.';
      if (err.code === 'auth/user-not-found') friendlyMessage = 'No account associated with this email.';
      setErrorMsg(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setErrorMsg(null);
    try {
      await handleGoogleSignIn();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth signature failed.');
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
            : 'Initialize your free Aurum Spark subscription instantly.'
          }
        </p>

        {/* Tab Selection Switch */}
        <div className="flex bg-[#0A0A0C] p-1 rounded-lg mb-6 border border-gold-950/20">
          <button
            onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md uppercase tracking-wider cursor-pointer transition-all ${authMode === 'signin' ? 'bg-[#111114] border border-gold-900/25 text-gold-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign In
          </button>
          <button
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
              <span>Authorize Signature</span>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex py-5 items-center justify-center">
          <div className="flex-grow border-t border-gold-900/10"></div>
          <span className="flex-shrink mx-4 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
            or alternative credentials
          </span>
          <div className="flex-grow border-t border-gold-900/10"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-2.5 bg-[#0A0A0C] hover:bg-[#15151A] text-gray-200 hover:text-white font-medium py-2.5 px-4 rounded-lg border border-gold-900/25 active:scale-[0.98] transition-all cursor-pointer font-sans text-xs uppercase tracking-wider"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

      </motion.div>
    </div>
  );
}
