import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, User, AlertCircle, CheckCircle2, X, BellRing, Layers, BarChart3, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import { hydrateFromServer, startSession } from '../api/sync';

const inputClass =
  'peer w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 transition';
const iconClass =
  'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 peer-focus:text-teal-600 transition-colors';

const highlights = [
  { icon: BellRing, title: 'Real-time alerts', text: 'Low stock, expiry and reorder warnings as they happen.', delay: '0s' },
  { icon: Layers, title: 'FIFO batch tracking', text: 'Always issue the oldest stock first.', delay: '-2s' },
  { icon: BarChart3, title: 'ABC analysis', text: 'Focus on the items that matter most.', delay: '-4s' },
];

function getErrorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Please check that the backend is running.';
  const data = err.response.data || {};
  if (data.errors) return Object.values(data.errors)[0][0];
  return data.message || 'Something went wrong. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // Already logged in? Go straight to the dashboard.
  useEffect(() => {
    if (localStorage.getItem('auth_token') && localStorage.getItem('user_authenticated') === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || (isSignUp && !fullName)) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const { data } = isSignUp
        ? await api.post('/register', { name: fullName.trim(), email: email.trim(), password })
        : await api.post('/login', { email: email.trim(), password });

      startSession(data);

      try {
        await hydrateFromServer();
      } catch (syncError) {
        console.warn('Could not load saved data:', syncError.message);
      }

      setSuccessMessage(isSignUp ? 'Account created! Redirecting...' : 'Welcome back! Redirecting...');
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="login-page min-h-screen font-sans text-slate-900 lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left: brand panel */}
      <aside className="login-hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="login-grid" />
        <span className="login-orb a" />
        <span className="login-orb b" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <img src="/logo-icon.png" alt="" className="h-7 w-7 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold">Walang Brownout</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-200/80">Inventory System</p>
          </div>
        </div>

        <div className="relative max-w-lg space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100 ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
              Smart warehouse control
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
              Keep your stock <span className="bg-linear-to-r from-teal-300 to-sky-300 bg-clip-text text-transparent">powered</span>, even when the lights go out.
            </h1>
            <p className="text-sm leading-relaxed text-sky-100/80">
              Monitor inventory, forecast demand and act on alerts, all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, title, text, delay }, i) => (
              <li
                key={title}
                className="login-glass flex items-center gap-4 rounded-2xl p-4"
                style={{ animationDelay: delay, marginLeft: `${i * 28}px` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-400/80 to-sky-500/80">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-sky-100/75">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-sky-100/70">
          <ShieldCheck className="h-4 w-4" />
          Secure, role-based access for your team
        </p>
      </aside>

      {/* Right: form */}
      <main className="login-form-side flex min-h-screen items-center justify-center p-6 sm:p-10 lg:min-h-0">
        <div className="login-card w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <img src="/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <p className="text-base font-semibold">Walang Brownout</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Inventory System</p>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {isSignUp ? 'Register a new staff account to get started.' : 'Log in to your account to continue.'}
          </p>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Full name</label>
                <div className="relative">
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Alie Smith"
                    className={inputClass}
                  />
                  <User className={iconClass} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
                <Mail className={iconClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="cursor-pointer text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className={`${inputClass} pr-12`}
                />
                <Lock className={iconClass} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isSignUp && <p className="text-xs text-slate-500">At least 6 characters.</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-btn group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : isSignUp ? (
                <UserPlus className="h-4 w-4" />
              ) : null}
              <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log In'}</span>
              {!loading && !isSignUp && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="cursor-pointer font-bold text-teal-700 hover:text-teal-900 hover:underline"
            >
              {isSignUp ? 'Log in' : 'Create an account'}
            </button>
          </p>

          {isSignUp && (
            <p className="mt-3 text-center text-xs text-slate-400">
              New accounts start as Warehouse Staff. An Administrator can change roles in User Management.
            </p>
          )}
        </div>
      </main>

      {/* Forgot password */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Forgot your password?</h3>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Passwords are reset by an Administrator. Ask your Administrator to open
              <span className="font-semibold text-slate-800"> Users </span>
              in the menu, edit your account and enter a new password. Then log in with it here.
            </p>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="h-10 w-full cursor-pointer rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}