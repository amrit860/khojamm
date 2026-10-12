import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AppLogo } from '../common/AppLogo';
import { 
  X, 
  Mail, 
  User, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  KeyRound,
  ShieldCheck
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'login' 
}) => {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    registerWithEmail, 
    sendPasswordReset, 
    currentUser 
  } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unauthorized Domain Guidance
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  // Auto-close modal as soon as user is authenticated
  useEffect(() => {
    if (!isOpen) return;

    if (currentUser || auth.currentUser) {
      setLoading(false);
      onClose();
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(false);
        onClose();
      }
    });

    return () => unsub();
  }, [currentUser, isOpen, onClose]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
      setSuccessMsg(null);
      setUnauthorizedDomain(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [defaultMode, isOpen]);

  if (!isOpen) return null;

  // Real Google Sign-In with popup
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setUnauthorizedDomain(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      setLoading(false);
      onClose();
    } catch (err: any) {
      console.warn("Google sign-in exception:", err);
      setLoading(false);

      const code = err?.code || '';
      const msg = typeof err?.message === 'string' ? err.message : '';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const host = window.location.hostname || window.location.host;
        setUnauthorizedDomain(host);
        setError(`This domain (${host}) needs to be added to Authorized Domains in Firebase Console for Google OAuth. You can add it now, or sign in below with Email & Password!`);
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use Email & Password.');
      } else if (code === 'auth/internal-error' || msg.includes('internal-error')) {
        setError('Firebase internal error with Google Auth provider. Please sign in with Email & Password below.');
      } else {
        setError(msg || 'Google Sign-In encountered an error. Please try Email & Password.');
      }
    }
  };
  const handleFacebookSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle('facebook');
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Facebook sign-in was closed before completing. Please try again.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with Google or Email. Please sign in with that method.');
      } else {
        setError(err?.message || 'Facebook sign-in failed. Please try another method.');
      }
    }
  };
  // Real Firebase Email & Password Sign-In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(cleanEmail, password);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Real Firebase Registration
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!confirmPassword) {
      setError('Please re-enter your password to confirm.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match perfectly.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail(cleanEmail, password, cleanName, phone);
      if (res.success) {
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Real Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPasswordReset(cleanEmail);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCurrentDomain = () => {
    const host = window.location.hostname || window.location.host;
    navigator.clipboard.writeText(host);
    setDomainCopied(true);
    setTimeout(() => setDomainCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-[#FBFBFA]">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" showName={false} showQuote={false} />
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                {mode === 'login' && 'Sign In to Khojamm'}
                {mode === 'register' && 'Create Khojamm Account'}
                {mode === 'forgot' && 'Reset Your Password'}
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500">
                {mode === 'login' && 'Access room listings, favorites & owner dashboard'}
                {mode === 'register' && 'Join Nepal\'s fastest-growing room search community'}
                {mode === 'forgot' && 'We\'ll email you a secure link to reset your password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs (Sign In vs Create Account) */}
        {mode !== 'forgot' && (
          <div className="px-5 pt-4 pb-1 bg-white border-b border-stone-100 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p>{error}</p>
                {unauthorizedDomain && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-red-800">{unauthorizedDomain}</span>
                    <button
                      type="button"
                      onClick={handleCopyCurrentDomain}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {domainCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {domainCopied ? 'Copied' : 'Copy Domain'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          {mode !== 'forgot' && (
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-700 font-semibold text-xs sm:text-sm border border-stone-300 rounded-xl flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
              
             {/*} <button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <span className="font-bold text-base leading-none">f</span>
                <span>Continue with Facebook</span>
              </button>
              */}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-white px-2 text-stone-400 font-semibold">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 1: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-[#4A282A] hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-stone-500 pt-1">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[#4A282A] font-bold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Password (min. 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a secure password"
                    minLength={6}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Re-Enter Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password to confirm"
                    minLength={6}
                    required
                    className={`w-full pl-10 pr-10 py-2.5 bg-stone-50 border rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : confirmPassword && password === confirmPassword
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-200'
                        : 'border-stone-200 focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Passwords do not match</span>
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Passwords match perfectly</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., +977 9800000000"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Create Account</span>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-stone-500 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[#4A282A] font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A]/30 focus:border-[#4A282A] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-amber-300" />
                    <span>Send Password Reset Email</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-semibold text-[#4A282A] hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
