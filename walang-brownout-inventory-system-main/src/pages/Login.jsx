import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../api/axios';
import { hydrateFromServer, startSession } from '../api/sync';

const inputClass =
  'w-full h-12 pl-12 pr-4 bg-white border-2 border-[#16293b] rounded-xl text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#23808f] focus:ring-4 focus:ring-[#23808f]/20 transition';
const iconClass = 'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#23808f]';

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
    <div className="login-page min-h-screen font-sans text-slate-900 lg:grid lg:grid-cols-2">
      {/* Left: photo band with diagonal shapes */}
      <aside className="login-hero hidden lg:block">
        <div className="login-photo" />

        <svg className="login-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="lg-light" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#bcd3e6" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="lg-teal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="1" stopColor="#0f9a9a" />
            </linearGradient>
          </defs>

          {/* top-left pale triangles */}
          <polygon points="0,0 33,0 0,61" fill="url(#lg-light)" />
          <polygon points="0,0 19,0 0,34" fill="#ffffff" opacity="0.5" />
          <polygon points="19,0 33,0 0,61 0,34" fill="#9fbdd6" opacity="0.28" />

          {/* teal diagonal stripe */}
          <polygon points="33,0 38,0 0,69 0,61" fill="url(#lg-teal)" opacity="0.92" />
          <polygon points="38,0 41,0 0,74 0,69" fill="#5eead4" opacity="0.22" />

          {/* bottom-right pale triangles */}
          <polygon points="100,28 100,100 60,100" fill="url(#lg-light)" />
          <polygon points="100,28 100,70 80,64" fill="#ffffff" opacity="0.5" />
          <polygon points="100,70 100,100 74,100 80,64" fill="#9fbdd6" opacity="0.28" />

          {/* thin diagonal lines */}
          <g fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
            <line x1="100" y1="28" x2="60" y2="100" stroke="#2dd4bf" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.8" />
            <line x1="97" y1="38" x2="57" y2="110" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
            <line x1="22" y1="0" x2="0" y2="40" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
            <line x1="24" y1="22" x2="12" y2="52" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
            <line x1="100" y1="18" x2="86" y2="44" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.6" />
          </g>
        </svg>

        {/* dot patterns */}
        <span className="login-dots text-[#0f2a6b]" style={{ left: '1.5rem', top: '2rem', width: '4.5rem', height: '5.5rem' }} />
        <span className="login-dots text-white/90" style={{ right: '2rem', top: '1.25rem', width: '5rem', height: '6.5rem' }} />

        {/* Powered by */}
        <div className="absolute bottom-[10%] right-[12%] flex h-32 w-32 items-center justify-center rounded-full bg-[#10224a] text-center text-sm font-medium leading-snug text-white shadow-xl">
          Powered by<br />Walang Brownout
        </div>
      </aside>

      {/* Right: form */}
      <main className="login-form-side flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="login-frame">
          <div className="login-card">
            <div className="login-badge flex items-center justify-center gap-3 rounded-xl px-5 py-4">
              <img src="/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
              <div className="leading-tight">
                <p className="text-lg font-medium text-slate-100">Walang Brownout</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">Inventory System</p>
              </div>
            </div>

            <h2 className="mt-7 text-center text-2xl font-medium tracking-tight text-slate-800">
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
                  <label htmlFor="fullName" className="text-base text-slate-900">Full name</label>
                  <div className="relative">
                    <User className={iconClass} />
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
                <label htmlFor="email" className="text-base text-slate-900">Email address</label>
                <div className="relative">
                  <User className={iconClass} />
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
                <label htmlFor="password" className="text-base text-slate-900">Password</label>
                <div className="relative">
                  <Lock className={iconClass} />
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
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#23808f] text-lg font-medium text-white shadow-md hover:bg-[#1c6a77] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log In'}</span>
              </button>
            </form>

            <div className="mt-5 space-y-3 text-base">
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