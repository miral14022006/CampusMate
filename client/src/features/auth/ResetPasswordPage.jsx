import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams } from 'react-router-dom';
import { Lock, MailQuestion } from 'lucide-react';
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

export default function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const { config } = useAuth();
  const { token } = useParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  if (!config.emailResetEnabled) {
    return (
      <AuthLayout>
        <div className="rounded-lg border border-hairline bg-surface-1 p-7 text-center shadow-lift">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MailQuestion className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[20px] font-semibold text-ink">Password reset is not enabled</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            Ask an administrator to reset your password for you.
          </p>
          <Link to="/login" className="mt-5 inline-block text-[12px] font-semibold text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (values) => {
    setError('');
    try {
      // The reset endpoint is only mounted when the server enables email reset.
      const response = await fetch(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: values.password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'This reset link is invalid or has expired.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.');
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-lg border border-hairline bg-surface-1 p-5 shadow-lift sm:p-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-ink">Choose a new password</h1>
        {done ? (
          <div className="mt-4">
            <p className="text-[13px] text-ink-secondary">Your password has been updated.</p>
            <Link to="/login" className="mt-4 inline-block text-[12px] font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
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
              Update password
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
