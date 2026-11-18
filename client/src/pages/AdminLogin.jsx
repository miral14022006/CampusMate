import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { useAdminAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../lib/hooks';
import { EASE } from '../lib/motion';

export default function AdminLogin() {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useDocumentTitle('Admin sign in');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={next && next.startsWith('/admin') ? next : '/admin'} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Enter both your username and password.');
      return;
    }
    try {
      await login(username, password);
      const next = new URLSearchParams(location.search).get('next');
      const fallback = location.state?.from?.pathname;
      const destination = next || fallback;
      navigate(destination && destination.startsWith('/admin') ? destination : '/admin', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Incorrect username or password.' : err.message);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-page">
      <div
        className="pointer-events-none absolute left-1/2 top-[-18%] h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-25 blur-[140px]"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          aria-label="CampusMate home"
          className="rounded-md outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Logo size="md" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-ink-muted hover:text-ink outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to campus
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-lg border border-hairline bg-surface-1 p-6 shadow-lift sm:p-8">
            <div className="flex flex-col items-center text-center">
              <Logo variant="mark" size="lg" />
              <h1 className="mt-5 text-[23px] font-semibold tracking-[-0.03em] text-ink">Admin sign in</h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                Manage documents, analytics and the review queue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <div>
                <label htmlFor="admin-username" className="mb-1.5 block text-[11.5px] font-semibold text-ink-secondary">
                  Username or email
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="admin"
                    aria-invalid={Boolean(error) || undefined}
                    className="h-11 w-full rounded-pill border border-hairline bg-surface-2 pl-10 pr-3.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-[11.5px] font-semibold text-ink-secondary">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    aria-invalid={Boolean(error) || undefined}
                    className="h-11 w-full rounded-pill border border-hairline bg-surface-2 pl-10 pr-11 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-ink-muted hover:bg-surface-3 hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-sm border border-[color:var(--negative)]/30 bg-negative-soft px-3 py-2.5 text-[12px] text-[color:var(--negative)]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              ) : null}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>

            <p className="mt-5 text-center text-[10.5px] leading-relaxed text-ink-muted">
              Admin access is restricted. Sessions expire after 24 hours.
            </p>
          </div>

          <p className="mt-5 text-center text-[10.5px] text-ink-muted">
            Seeded account? Run{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
              node server/scripts/seedAdmin.js
            </code>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
