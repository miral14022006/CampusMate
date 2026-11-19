import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { AuthField, FormMessage, PasswordStrength } from './AuthField';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[a-zA-Z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.')
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.'
  });

export default function ChangePasswordPage({ forced = false }) {
  useDocumentTitle('Change password');
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  });

  const onSubmit = async (values) => {
    setError('');
    try {
      await changePassword(values);
      navigate(forced ? '/admin/dashboard' : '/profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not update your password.');
    }
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
      <div className="rounded-lg border border-hairline bg-surface-1 p-5 shadow-lift sm:p-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-ink">
          {forced ? 'Choose a new password' : 'Change your password'}
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          {forced
            ? 'Your account was created with a temporary password. Set a new one before continuing.'
            : 'Use a strong password you do not reuse elsewhere.'}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const first = Object.keys(errors)[0];
            if (first) form.setFocus(first);
          })}
          noValidate
        >
          <AuthField
            label="Current password"
            icon={Lock}
            autoComplete="current-password"
            showPasswordToggle
            error={form.formState.errors.currentPassword?.message}
            {...form.register('currentPassword')}
          />
          <div>
            <AuthField
              label="New password"
              icon={Lock}
              autoComplete="new-password"
              showPasswordToggle
              error={form.formState.errors.newPassword?.message}
              {...form.register('newPassword')}
            />
            <PasswordStrength value={form.watch('newPassword') || ''} />
          </div>
          <AuthField
            label="Confirm new password"
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
      </div>
    </AuthLayout>
  );
}
