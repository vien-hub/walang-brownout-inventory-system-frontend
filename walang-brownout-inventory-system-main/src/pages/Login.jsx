import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, User, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../api/axios';
import { hydrateFromServer, startSession } from '../api/sync';

const inputClass =
  'w-full h-12 pl-11 pr-4 bg-white border-2 border-[#16293b] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#23808f] focus:ring-4 focus:ring-[#23808f]/20 transition';

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
    <div className="login-page min-h-screen grid lg:grid-cols-2 font-sans text-slate-900">
      {/* Photo panel */}
      <aside className="login-hero relative hidden lg:block">
        <div className="login-hero-stripe" />
        <div className="absolute bottom-10 right-16 flex h-36 w-36 items-center justify-center rounded-full bg-[#10224a] text-center text-sm font-medium leading-snug text-white shadow-xl">
          Powered by<br />Walang Brownout
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="login-card w-full max-w-md">
          <div className="flex items-center justify-center gap-3 rounded-xl bg-[#3f5062] px-5 py-4 shadow-lg">
            <img src="/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
            <div className="leading-tight">
              <p className="text-lg font-semibold text-white">Walang Brownout</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">Inventory System</p>
            </div>
          </div>

          <h2 className="mt-6 text-center text-2xl font-semibold tracking-tight">
            {isSignUp ? 'Create your account' : 'Log in to your account'}
          </h2>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-800">Full name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#23808f]" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-800">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#23808f]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-800">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#23808f]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-800"
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
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#23808f] text-base font-semibold text-white shadow-md hover:bg-[#1c6a77] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : isSignUp ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log In'}</span>
            </button>
          </form>

          <div className="mt-5 space-y-2 text-sm">
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="block cursor-pointer text-slate-900 hover:text-[#23808f] hover:underline"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={switchMode}
              className="block cursor-pointer text-slate-900 hover:text-[#23808f] hover:underline"
            >
              {isSignUp ? 'Already have an account? Log in' : 'Create an account'}
            </button>
          </div>

          {isSignUp && (
            <p className="mt-4 text-xs text-slate-500">
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
              className="h-10 w-full cursor-pointer rounded-lg bg-[#23808f] text-sm font-semibold text-white hover:bg-[#1c6a77]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}