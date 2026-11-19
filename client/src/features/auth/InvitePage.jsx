import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Lock, ShieldCheck, UserX } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { AuthField, FormMessage, PasswordStrength } from './AuthField';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[a-zA-Z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm your password.')
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.'
  });

function StatePanel({ title, message }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-7 text-center shadow-lift">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[20px] font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{message}</p>
      <Link to="/admin/login" className="mt-5 inline-block text-[12px] font-semibold text-accent hover:underline">
        Go to admin sign in
      </Link>
    </div>
  );
}

export default function InvitePage() {
  useDocumentTitle('Accept admin invitation');
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [state, setState] = useState({ status: 'loading', invite: null, message: '' });
  const [error, setError] = useState('');
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    let cancelled = false;
    api.auth
      .getInvite(token)
      .then((data) => {
        if (!cancelled) setState({ status: 'valid', invite: data.invite, message: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err.data?.status || (err.status === 410 ? 'expired' : 'invalid');
        setState({ status, invite: null, message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (values) => {
    setError('');
    try {
      await acceptInvite(token, values.password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not accept this invitation.');
    }
  };

  if (state.status === 'loading') {
    return (
      <AuthLayout variant="admin">
        <div className="rounded-lg border border-hairline bg-surface-1 p-7 text-center" role="status" aria-live="polite">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-surface-2" />
          <p className="mt-4 text-[13px] text-ink-muted">Checking your invitation…</p>
        </div>
      </AuthLayout>
    );
  }

  if (state.status !== 'valid') {
    const copy = {
      expired: {
        title: 'This invitation has expired',
        message: 'Invitation links are valid for 48 hours. Ask a superadmin for a fresh one.'
      },
      used: {
        title: 'This invitation was already used',
        message: 'If this is your account, sign in with the password you chose. Otherwise ask a superadmin for a new link.'
      },
      revoked: {
        title: 'This invitation was revoked',
        message: 'Ask a superadmin to send you a new invitation.'
      },
      invalid: {
        title: 'This invitation link is not valid',
        message: state.message || 'Check that you copied the full link, or ask a superadmin to resend it.'
      }
    }[state.status] || {
      title: 'This invitation cannot be used',
      message: state.message || 'Ask a superadmin to send a new invitation.'
    };

    return (
      <AuthLayout
        variant="admin"
        badge={
          <span className="rounded-pill border border-[color:var(--accent-ring)] bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent">
            Admin console
          </span>
        }
      >
        <StatePanel title={copy.title} message={copy.message} />
      </AuthLayout>
    );
  }

  const { invite } = state;

  return (
    <AuthLayout
      variant="admin"
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-[color:var(--accent-ring)] bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Admin invitation
        </span>
      }
    >
      <div className="rounded-lg border border-hairline bg-surface-1 p-5 shadow-lift sm:p-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-ink">Set your password</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          You have been invited to the CampusMate admin console.
        </p>

        <div className="mt-4 rounded-sm border border-hairline bg-surface-2 px-3.5 py-3">
          <p className="text-[13px] font-semibold text-ink">{invite.name}</p>
          <p className="text-[12px] text-ink-muted">{invite.email}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ink-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Expires {new Date(invite.expiresAt).toLocaleString()}
          </p>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const first = Object.keys(errors)[0];
            if (first) form.setFocus(first);
          })}
          noValidate
        >
          <div>
            <AuthField
              label="New password"
              icon={Lock}
              autoComplete="new-password"
              showPasswordToggle
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <PasswordStrength value={form.watch('password') || ''} />
          </div>
          <AuthField
            label="Confirm password"
            icon={Lock}
            autoComplete="new-password"
            showPasswordToggle
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <FormMessage>{error}</FormMessage>
          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            Accept invitation
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
