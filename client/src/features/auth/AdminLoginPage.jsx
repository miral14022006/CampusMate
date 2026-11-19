import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock, ShieldCheck, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { AuthField, FormMessage } from './AuthField';
import { nextFromLocation } from './guards';
import { EASE } from '../../lib/motion';

const schema = z.object({
  email: z.string().min(1, 'Enter your admin email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().optional()
});

export default function AdminLoginPage() {
  useDocumentTitle('Admin Console · Sign In');
  const { adminLogin, isAdmin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const next = nextFromLocation(location);
  const destination = next && next.startsWith('/admin') ? next : '/admin/dashboard';

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isAdmin) {
      navigate(user?.mustChangePassword ? '/admin/change-password' : destination, { replace: true });
    }
  }, [isAuthenticated, isAdmin, user, navigate, destination]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const data = await adminLogin(values.email, values.password, Boolean(values.rememberMe));
      navigate(data.user?.mustChangePassword ? '/admin/change-password' : destination, { replace: true });
    } catch (err) {
      setServerError(
        err.status === 401 || err.status === 403
          ? 'Invalid credentials or insufficient permissions.'
          : err.message || 'Could not sign in to the admin console.'
      );
    }
  };

  return (
    <AuthLayout
      variant="admin"
      badge={
        <div className="flex items-center gap-2 rounded-pill border border-amber-500/40 bg-[#161616]/90 px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.14em] text-amber-400 shadow-md backdrop-blur-xl">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          <span>Privileged Portal</span>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#161616]/94 p-7 shadow-2xl backdrop-blur-2xl sm:p-9"
      >
        {/* Amber-copper dual security top strip */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-95" />

        <div className="flex items-center justify-between">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-inner p-2.5">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <span className="rounded-pill border border-white/15 bg-black/40 px-3.5 py-1 text-[12px] font-semibold text-zinc-200">
            Internal Access Only
          </span>
        </div>

        <div className="mt-5">
          <h1 className="text-[26px] font-bold tracking-tight text-white sm:text-[29px]">
            Admin console
          </h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-300">
            Sign in with your verified administrator credentials to access campus governance and audit telemetry.
          </p>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-[12.5px] leading-relaxed text-amber-100">
          <ShieldAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-400" />
          <span>
            Every sign-in attempt, IP address hash, and administrative action is permanently recorded in the immutable audit log.
          </span>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          <AuthField
            label="Admin email"
            icon={AtSign}
            type="email"
            autoComplete="username"
            placeholder="admin@pdeu.ac.in"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />

          <div>
            <AuthField
              label="Password"
              icon={Lock}
              autoComplete="current-password"
              placeholder="Your password"
              showPasswordToggle
              error={form.formState.errors.password?.message}
              onKeyUp={(event) => setCapsLock(event.getModifierState?.('CapsLock'))}
              onKeyDown={(event) => setCapsLock(event.getModifierState?.('CapsLock'))}
              {...form.register('password')}
            />
            {capsLock ? (
              <p className="mt-1 text-[12px] font-medium text-amber-300" role="status" aria-live="polite">
                Caps Lock is turned on.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-zinc-200 font-medium">
              <input
                type="checkbox"
                className="h-4.5 w-4.5 rounded border-white/20 bg-black/40 accent-amber-500"
                {...form.register('rememberMe')}
              />
              Keep session active
            </label>
            <span className="text-[12px] text-zinc-400">Restricted session</span>
          </div>

          <FormMessage>{serverError}</FormMessage>

          <Button
            type="submit"
            size="lg"
            className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-[14.5px] border-none shadow-lg"
            loading={form.formState.isSubmitting}
          >
            Authenticate session
            <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3.5 text-[13px] text-zinc-400">
          <span>Are you a student?</span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
          >
            Student portal →
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
