import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('gm_session_expired') === '1') {
      setInfo('Your session expired due to inactivity. Please sign in again.');
      localStorage.removeItem('gm_session_expired');
    }
  }, []);

  useEffect(() => {
    let interval;
    if (lockoutRemaining > 0) {
      interval = setInterval(() => {
        setLockoutRemaining((prev) => {
          if (prev <= 1000) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const getLockoutTimeLeft = (emailAddr) => {
    const lockoutTime = localStorage.getItem('lockout_' + emailAddr);
    if (!lockoutTime) return 0;
    const remaining = 15 * 60 * 1000 - (Date.now() - parseInt(lockoutTime, 10));
    return remaining > 0 ? remaining : 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const remaining = getLockoutTimeLeft(email);
    if (remaining > 0) {
      setLockoutRemaining(remaining);
      setError(`Too many failed attempts. Locked out. Try again in ${Math.ceil(remaining / 60000)} minutes.`);
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      localStorage.removeItem('failed_attempts_' + email);
      localStorage.removeItem('lockout_' + email);
      navigate('/dashboard');
    } catch (err) {
      const key = 'failed_attempts_' + email;
      const attempts = parseInt(localStorage.getItem(key) || '0', 10) + 1;
      if (attempts >= 5) {
        localStorage.setItem('lockout_' + email, Date.now().toString());
        localStorage.removeItem(key);
        setLockoutRemaining(15 * 60 * 1000);
        setError('Too many failed attempts. Locked out for 15 minutes.');
      } else {
        localStorage.setItem(key, attempts.toString());
        setError(`${err.message || 'Unable to sign in.'} (Attempt ${attempts}/5)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset link sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Error sending reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--bg-base)] p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ganga Maxx Admin Login</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in with your email and password.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              placeholder="your.email@gangamaxx.com"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              placeholder="Enter your Firebase password"
              autoComplete="current-password"
              required={lockoutRemaining === 0}
              disabled={lockoutRemaining > 0}
            />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {info && <p className="text-sm text-green-600">{info}</p>}
          <button
            type="submit"
            disabled={loading || lockoutRemaining > 0}
            className="w-full rounded-3xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Processing…' : lockoutRemaining > 0 ? `Locked Out (${Math.ceil(lockoutRemaining / 1000)}s)` : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
