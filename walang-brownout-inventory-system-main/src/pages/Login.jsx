import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, User, AlertCircle, CheckCircle2, Shield, Package, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import { hydrateFromServer, startSession } from '../api/sync';

const inputClass =
  'w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 transition';

const features = [
  { icon: Package, title: 'Live stock monitoring', text: 'Track every SKU and get alerts before items run out.' },
  { icon: TrendingUp, title: 'Demand forecasting', text: 'Plan reorders using seasonal demand and sales trends.' },
  { icon: Shield, title: 'Role-based access', text: 'Administrators, managers and staff each see what they need.' },
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
    <div className="min-h-screen grid lg:grid-cols-2 font-sans text-slate-900">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-linear-to-br from-[#0b1620] via-[#12222f] to-[#0f2c36] p-12 text-white">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative inline-flex self-start rounded-3xl bg-white/95 px-5 py-3 shadow-2xl shadow-sky-950/30">
          <img src="/logo.png" alt="WalangBrownout Inventory System" className="h-14 w-auto" />
        </div>

        <div className="relative space-y-8 max-w-md">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Keep your inventory powered, even when the lights go out.
            </h1>
            <p className="text-sky-100 text-sm leading-relaxed">
              Monitor stocks, forecast demand, and manage backorders with real-time tracking.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-xl bg-white/15 border border-white/20">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs text-sky-100/90">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sky-100/80">Inventory Management System</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden">
            <img src="/logo.png" alt="WalangBrownout Inventory System" className="h-14 w-auto" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {isSignUp ? 'Register a new staff account to get started.' : 'Please log in to access your dashboard.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-sm font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-800 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Alie Smith"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && <p className="text-xs text-slate-400">At least 6 characters.</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-linear-to-r from-sky-600 to-sky-800 hover:from-sky-700 hover:to-sky-900 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-lg shadow-sky-700/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : isSignUp ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log in'}</span>
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={switchMode} className="font-bold text-sky-700 hover:text-sky-900 cursor-pointer">
              {isSignUp ? 'Log in' : 'Register new account'}
            </button>
          </p>

          {isSignUp && (
            <p className="text-xs text-slate-400 text-center">
              New accounts start as Warehouse Staff. An Administrator can change roles in User Management.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
