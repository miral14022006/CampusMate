import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock, User, GraduationCap, ArrowRight, Sparkles, Shield, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { AuthLayout } from './AuthLayout';
import { AuthField, FormMessage, PasswordStrength } from './AuthField';
import { nextFromLocation } from './guards';
import { EASE } from '../../lib/motion';

const NOTE =
  'Administrators can see anonymized usage statistics and review conversations to improve the assistant.';

export const PDEU_BRANCHES = [
  'Computer Engineering',
  'Information & Communication Technology',
  'Artificial Intelligence & Data Science',
  'Chemical Engineering',
  'Petroleum Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Electronics & Communication Engineering'
];

const signInSchema = z.object({
  email: z.string().min(1, 'Enter your college email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().optional()
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name.').max(100),
    email: z.string().min(1, 'Enter your college email.').email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[a-zA-Z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    semester: z.string().optional(),
    branch: z.string().trim().max(100).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: 'Please accept the data-use note to continue.' }) })
  })
  .refine(
    (values) => {
      const domain = values.email.split('@')[1]?.toLowerCase();
      return Boolean(domain);
    },
    { path: ['email'], message: 'Use your college email address.' }
  );

function Tabs({ tab, onChange }) {
  return (
    <div className="relative grid grid-cols-2 gap-1.5 rounded-xl border border-white/15 bg-black/50 p-1.5 shadow-inner backdrop-blur-md" role="tablist" aria-label="Authentication">
      {[
        { id: 'signin', label: 'Sign in' },
        { id: 'signup', label: 'Create account' }
      ].map((item) => {
        const isActive = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${item.id}`}
            onClick={() => onChange(item.id)}
            className={`relative z-10 h-10 rounded-lg text-[14px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive ? 'text-white' : 'text-zinc-300 hover:text-white'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 rounded-lg bg-accent shadow-md"
                transition={{ duration: 0.3, ease: EASE }}
              />
            )}
            <span className="relative z-20">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  useDocumentTitle('Sign in · CampusMate');
  const { login, signup, continueAsGuest, config, guestMode, claimGuestHistory, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('signin');
  const [serverError, setServerError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [guestOffer, setGuestOffer] = useState(false);
  const [importing, setImporting] = useState(false);
  const pendingNext = useRef(null);
  const next = nextFromLocation(location);

  const signIn = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '', rememberMe: true }
  });
  const signUp = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', semester: '', branch: '', consent: false }
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate(next || '/app', { replace: true });
    }
  }, [isAuthenticated, user, navigate, next]);

  const finish = (destination) => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    const hasGuestChats =
      typeof window !== 'undefined' && window.localStorage.getItem('campusmate_has_guest_chats') === '1';
    if (hasGuestChats && guestMode) {
      pendingNext.current = destination;
      setGuestOffer(true);
    } else {
      navigate(destination, { replace: true });
    }
  };

  const onSignIn = async (values) => {
    setServerError('');
    try {
      await login(values.email, values.password, Boolean(values.rememberMe));
      finish(next || '/app');
    } catch (err) {
      setServerError(err.status === 401 ? 'Incorrect email or password.' : err.message || 'Could not sign you in.');
    }
  };

  const onSignUp = async (values) => {
    setServerError('');
    try {
      await signup({
        name: values.name,
        email: values.email,
        password: values.password,
        semester: values.semester ? Number(values.semester) : undefined,
        branch: values.branch || undefined
      });
      finish(next || '/app');
    } catch (err) {
      setServerError(err.message || 'Could not create your account.');
    }
  };

  const onInvalid = (errors) => {
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const el = document.querySelector(`[name="${firstKey}"]`);
      if (el && typeof el.focus === 'function') el.focus();
    }
  };

  const handleGuest = async () => {
    setServerError('');
    try {
      await continueAsGuest();
      navigate(next || '/app', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Could not start guest session.');
    }
  };

  const acceptImport = async () => {
    setImporting(true);
    await claimGuestHistory();
    setImporting(false);
    navigate(pendingNext.current || '/app', { replace: true });
  };

  return (
    <AuthLayout variant="student">
      {/* High-Contrast Frosted Glass Card with Sizable Architecture */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#161616]/94 p-7 shadow-2xl backdrop-blur-2xl sm:p-8">
        {/* Subtle accent border top glow */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-95" />

        <Tabs
          tab={tab}
          onChange={(value) => {
            setTab(value);
            setServerError('');
          }}
        />

        <div className="mt-5">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <h1 className="text-[25px] font-bold tracking-tight text-white sm:text-[28px]">
              {tab === 'signin' ? 'Welcome back' : 'Create student account'}
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-zinc-300">
              {tab === 'signin'
                ? 'Sign in to access your chat memory, notices, and synced campus calendar.'
                : 'Join with your college email. Semester & branch personalize your dates.'}
            </p>
          </motion.div>
        </div>

        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/40 p-3 text-[12.5px] leading-relaxed text-zinc-300">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{NOTE}</span>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'signin' ? (
            <motion.form
              key="signin-form"
              id="panel-signin"
              role="tabpanel"
              aria-labelledby="tab-signin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="mt-5 space-y-4"
              onSubmit={signIn.handleSubmit(onSignIn, onInvalid)}
              noValidate
            >
              <AuthField
                label="College email"
                icon={AtSign}
                type="email"
                autoComplete="username"
                placeholder="you@pdeu.ac.in"
                error={signIn.formState.errors.email?.message}
                {...signIn.register('email')}
              />

              <div>
                <AuthField
                  label="Password"
                  icon={Lock}
                  autoComplete="current-password"
                  placeholder="Your password"
                  showPasswordToggle
                  error={signIn.formState.errors.password?.message}
                  onKeyUp={(event) => setCapsLock(event.getModifierState?.('CapsLock'))}
                  onKeyDown={(event) => setCapsLock(event.getModifierState?.('CapsLock'))}
                  {...signIn.register('password')}
                />
                {capsLock ? (
                  <p className="mt-1 text-[12px] font-medium text-amber-300" role="status" aria-live="polite">
                    Caps Lock is turned on.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-zinc-200 font-medium">
                  <input
                    type="checkbox"
                    className="h-4.5 w-4.5 rounded border-white/20 bg-black/40 accent-[color:var(--accent)]"
                    {...signIn.register('rememberMe')}
                  />
                  Remember me
                </label>

                {config.emailResetEnabled ? (
                  <Link to="/forgot-password" className="text-[13px] font-semibold text-accent hover:underline">
                    Forgot password?
                  </Link>
                ) : (
                  <span className="text-[12px] text-zinc-400">Need a reset? Contact your admin.</span>
                )}
              </div>

              <FormMessage>{serverError}</FormMessage>

              <Button type="submit" size="lg" className="w-full h-11 text-[14.5px] font-semibold" loading={signIn.formState.isSubmitting}>
                Sign in
                <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              </Button>

              {guestMode ? (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={handleGuest}
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-zinc-300 transition-colors hover:text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                    Continue as guest
                  </button>
                </div>
              ) : null}
            </motion.form>
          ) : (
            <motion.form
              key="signup-form"
              id="panel-signup"
              role="tabpanel"
              aria-labelledby="tab-signup"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="mt-4 space-y-3.5"
              onSubmit={signUp.handleSubmit(onSignUp, onInvalid)}
              noValidate
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AuthField
                  label="Full name"
                  icon={User}
                  autoComplete="name"
                  placeholder="e.g. Ronak Shah"
                  error={signUp.formState.errors.name?.message}
                  {...signUp.register('name')}
                />

                <AuthField
                  label="College email"
                  icon={AtSign}
                  type="email"
                  autoComplete="email"
                  placeholder="you@pdeu.ac.in"
                  error={signUp.formState.errors.email?.message}
                  {...signUp.register('email')}
                />
              </div>

              <div>
                <AuthField
                  label="Create password"
                  icon={Lock}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  showPasswordToggle
                  error={signUp.formState.errors.password?.message}
                  {...signUp.register('password')}
                />
                <PasswordStrength value={signUp.watch('password') || ''} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="signup-semester" className="mb-1.5 block text-[13.5px] font-semibold text-zinc-100">
                    Semester <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="signup-semester"
                      className="h-11 w-full appearance-none rounded-xl border border-white/15 bg-[#141414]/90 pl-3.5 pr-10 text-[14px] text-white outline-none transition-all hover:border-white/30 focus:border-accent focus:ring-2 focus:ring-accent/30 backdrop-blur-md cursor-pointer"
                      {...signUp.register('semester')}
                    >
                      <option value="" className="bg-[#181818] text-zinc-400">Select later</option>
                      {Array.from({ length: 8 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={String(value)} className="bg-[#181818] text-white">
                          Semester {value}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400 transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-branch" className="mb-1.5 block text-[13.5px] font-semibold text-zinc-100">
                    Branch <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="signup-branch"
                      className="h-11 w-full appearance-none rounded-xl border border-white/15 bg-[#141414]/90 pl-3.5 pr-10 text-[14px] text-white outline-none transition-all hover:border-white/30 focus:border-accent focus:ring-2 focus:ring-accent/30 backdrop-blur-md cursor-pointer"
                      {...signUp.register('branch')}
                    >
                      <option value="" className="bg-[#181818] text-zinc-400">Select branch</option>
                      {PDEU_BRANCHES.map((b) => (
                        <option key={b} value={b} className="bg-[#181818] text-white">
                          {b}
                        </option>
                      ))}
                      <option value="Other" className="bg-[#181818] text-white">Other</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400 transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-zinc-200">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-white/20 bg-black/40 accent-[color:var(--accent)]"
                    aria-invalid={signUp.formState.errors.consent ? true : undefined}
                    {...signUp.register('consent')}
                  />
                  <span>
                    I consent to anonymized usage statistics & admin chat quality review.
                  </span>
                </label>
                {signUp.formState.errors.consent?.message ? (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-[#f87171]" role="alert">
                    {signUp.formState.errors.consent.message}
                  </p>
                ) : null}
              </div>

              <FormMessage>{serverError}</FormMessage>

              <Button type="submit" size="lg" className="w-full h-11 text-[14.5px] font-semibold" loading={signUp.formState.isSubmitting}>
                Create account
                <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-[13px] text-zinc-400">
          <span>Are you staff or faculty?</span>
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
          >
            Admin console →
          </Link>
        </div>
      </div>

      <Dialog
        open={guestOffer}
        onClose={() => finish(pendingNext.current || '/app')}
        title="Import previous chats?"
        description="We found anonymous conversations from this device. Would you like to link them to your new account?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-[13.5px] leading-relaxed text-zinc-200">
            Your recent chat threads will be securely moved onto your verified profile so you can resume them anywhere.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              onClick={() => finish(pendingNext.current || '/app')}
              disabled={importing}
            >
              Start fresh
            </Button>
            <Button onClick={acceptImport} loading={importing}>
              Import chats
            </Button>
          </div>
        </div>
      </Dialog>
    </AuthLayout>
  );
}
