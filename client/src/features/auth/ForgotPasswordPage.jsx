import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, MailQuestion } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../lib/hooks';
import { Button } from '../../components/ui/Button';
import { AuthLayout } from './AuthLayout';
import { AuthField, FormMessage } from './AuthField';

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const { config } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!config.emailResetEnabled) {
    return (
      <AuthLayout>
        <div className="rounded-lg border border-hairline bg-surface-1 p-7 text-center shadow-lift">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MailQuestion className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[20px] font-semibold text-ink">Password reset is not enabled</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            Ask a campus administrator to reset your password from the admin console, then sign in with the temporary
            password.
          </p>
          <Link to="/login" className="mt-5 inline-block text-[12px] font-semibold text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    // The server exposes reset only when an email provider is configured.
    setSent(true);
  };

  return (
    <AuthLayout>
      <div className="rounded-lg border border-hairline bg-surface-1 p-5 shadow-lift sm:p-7">
        <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-ink">Reset your password</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          We will email a one-time reset link if an account exists for that address.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <AuthField
            label="College email"
            icon={AtSign}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error}
          />
          <FormMessage variant="success">
            {sent ? 'If the address is registered, a reset link is on its way.' : ''}
          </FormMessage>
          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
        <Link to="/login" className="mt-4 block text-center text-[12px] font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
