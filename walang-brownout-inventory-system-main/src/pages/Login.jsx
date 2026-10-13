import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, User, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import api from '../api/axios';
import { hydrateFromServer, startSession } from '../api/sync';

const inputClass = 'login-input';

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
  const [infoMessage, setInfoMessage] = useState('');

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
    setInfoMessage('');

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
    setInfoMessage('');
  };

  const handleForgot = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setInfoMessage('Please ask an Administrator to reset your password in User Management.');
  };

  return (
    <div className="login-page">
      {/* ===== Left: warehouse photo with diagonal cut ===== */}
      <aside className="login-hero" aria-hidden="true">
        <div className="login-hero-photo" />
        <svg className="login-hero-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points="17,0 0,62" />
          <polyline points="100,26 57,100" />
        </svg>
        <div className="login-dots login-dots-tl" />
        <div className="login-dots login-dots-tr" />
        <div className="login-powered">
          <span>Powered by</span>
          <strong>Walang Brownout</strong>
            <img src="/logo-inventory.jpg" alt="Inventory Logo" />
        </div>
      </aside>
    

      {/* ===== Right: login card ===== */}
      <main className="login-panel">
        <div className="login-card-wrap">
          <div className="login-card">
            <div className="login-brand">
              <img src="/logo-icon.png" alt="" />
              <div>
                <p>Walang Brownout</p>
                <span>Inventory system</span>
              </div>
            </div>

            <h1 className="login-title">{isSignUp ? 'Create your account' : 'Log in to your account'}</h1>

            {errorMessage && (
              <div className="login-alert login-alert-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="login-alert login-alert-success">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
            {infoMessage && (
              <div className="login-alert login-alert-info">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="login-label">Full name</label>
                  <div className="login-field">
                    <User className="login-icon" />
                    <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name" className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="login-label">Email address</label>
                <div className="login-field">
                  <Mail className="login-icon" />
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address" autoComplete="email" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="login-label">Password</label>
                <div className="login-field">
                  <Lock className="login-icon" />
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'} className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="login-eye" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isSignUp && <p className="login-hint">At least 6 characters.</p>}
              </div>

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : isSignUp ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Log In'}</span>
              </button>
            </form>

            <div className="login-links">
              {!isSignUp && (
                <button type="button" onClick={handleForgot}>Forgot password?</button>
              )}
              <button type="button" onClick={switchMode}>
                {isSignUp ? 'Already have an account? Log in' : 'Create an account'}
              </button>
            </div>

            {isSignUp && (
              <p className="login-hint">
                New accounts start as Warehouse Staff. An Administrator can change roles in User Management.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}