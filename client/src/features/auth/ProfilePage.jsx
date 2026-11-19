import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, KeyRound, Laptop, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useDocumentTitle } from '../../lib/hooks';
import { AuthField, FormMessage, PasswordStrength } from './AuthField';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  semester: z.string().optional(),
  branch: z.string().trim().max(100).optional()
});

const passwordSchema = z
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

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user, isAuthenticated, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsMessage, setSessionsMessage] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      semester: user?.semester ? String(user.semester) : '',
      branch: user?.branch || ''
    }
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?next=%2Fprofile', { replace: true });
      return;
    }
    profileForm.reset({
      name: user?.name || '',
      semester: user?.semester ? String(user.semester) : '',
      branch: user?.branch || ''
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.name, user?.semester, user?.branch]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await api.auth.sessions();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadSessions();
  }, [isAuthenticated]);

  const saveProfile = async (values) => {
    setProfileError('');
    setProfileMessage('');
    try {
      await updateProfile({
        name: values.name.trim(),
        semester: values.semester ? Number(values.semester) : null,
        branch: values.branch.trim() || null
      });
      // Pre-fill the calendar filters with the saved academic details.
      if (values.semester) localStorage.setItem('cm_cal_sem', values.semester);
      if (values.branch) localStorage.setItem('cm_cal_branch', values.branch);
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileError(err.message || 'Could not update your profile.');
    }
  };

  const savePassword = async (values) => {
    setPasswordError('');
    setPasswordMessage('');
    try {
      await changePassword(values);
      passwordForm.reset();
      setPasswordMessage('Password updated. Other sessions were signed out.');
      loadSessions();
    } catch (err) {
      setPasswordError(err.message || 'Could not change your password.');
    }
  };

  const signOutOthers = async () => {
    setSessionsMessage('');
    try {
      const data = await api.auth.signOutOthers();
      setSessionsMessage(`Signed out ${data.revoked || 0} other session${data.revoked === 1 ? '' : 's'}.`);
      loadSessions();
    } catch (err) {
      setSessionsMessage(err.message || 'Could not sign out other devices.');
    }
  };

  const revoke = async (id) => {
    try {
      await api.auth.revokeSession(id);
      loadSessions();
    } catch {
      /* ignore */
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-app/90 px-4 backdrop-blur sm:px-8">
        <Link to="/app" aria-label="Back to CampusMate" className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-secondary hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <Logo variant="mark" size="sm" />
          <span className="hidden sm:inline">Back to app</span>
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[920px] px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-[15px] font-bold text-accent">
            {(user?.name || user?.email || 'S').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold tracking-[-0.03em] text-ink">{user?.name || 'Student'}</h1>
            <p className="truncate text-[12.5px] text-ink-muted">
              {user?.email} · {user?.role || 'student'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="text-[15px] font-semibold text-ink">Profile details</h2>
            <p className="mt-1 text-[12px] text-ink-muted">Semester and branch pre-fill your calendar filters.</p>
            <form
              className="mt-4 space-y-3.5"
              onSubmit={profileForm.handleSubmit(saveProfile, (errors) => {
                const first = Object.keys(errors)[0];
                if (first) profileForm.setFocus(first);
              })}
              noValidate
            >
              <AuthField label="Full name" autoComplete="name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-semester" className="mb-1.5 block text-[11.5px] font-semibold text-ink-secondary">
                    Semester
                  </label>
                  <select
                    id="profile-semester"
                    className="h-11 w-full rounded-pill border border-hairline bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-accent"
                    {...profileForm.register('semester')}
                  >
                    <option value="">Not set</option>
                    {Array.from({ length: 8 }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={String(value)}>
                        Semester {value}
                      </option>
                    ))}
                  </select>
                </div>
                <AuthField label="Branch" placeholder="Computer Engineering" error={profileForm.formState.errors.branch?.message} {...profileForm.register('branch')} />
              </div>
              <FormMessage>{profileError}</FormMessage>
              <FormMessage variant="success">{profileMessage}</FormMessage>
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                Save profile
              </Button>
            </form>
          </Card>

          <Card padding="lg">
            <h2 className="text-[15px] font-semibold text-ink">Change password</h2>
            <p className="mt-1 text-[12px] text-ink-muted">All other sessions are signed out after a password change.</p>
            <form
              className="mt-4 space-y-3.5"
              onSubmit={passwordForm.handleSubmit(savePassword, (errors) => {
                const first = Object.keys(errors)[0];
                if (first) passwordForm.setFocus(first);
              })}
              noValidate
            >
              <AuthField
                label="Current password"
                icon={KeyRound}
                autoComplete="current-password"
                showPasswordToggle
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register('currentPassword')}
              />
              <div>
                <AuthField
                  label="New password"
                  autoComplete="new-password"
                  showPasswordToggle
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />
                <PasswordStrength value={passwordForm.watch('newPassword') || ''} />
              </div>
              <AuthField
                label="Confirm new password"
                autoComplete="new-password"
                showPasswordToggle
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register('confirmPassword')}
              />
              <FormMessage>{passwordError}</FormMessage>
              <FormMessage variant="success">{passwordMessage}</FormMessage>
              <Button type="submit" variant="secondary" loading={passwordForm.formState.isSubmitting}>
                Update password
              </Button>
            </form>
          </Card>
        </div>

        <Card padding="lg" className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Active sessions</h2>
              <p className="mt-1 text-[12px] text-ink-muted">Devices currently signed in to your account.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={signOutOthers} leftIcon={<Laptop className="h-3.5 w-3.5" />}>
              Sign out other devices
            </Button>
          </div>
          {sessionsMessage ? (
            <p className="mt-3 text-[11.5px] text-ink-muted" role="status" aria-live="polite">
              {sessionsMessage}
            </p>
          ) : null}
          <div className="mt-4 divide-y divide-[color:var(--border)]">
            {sessionsLoading ? (
              <div className="h-14 animate-pulse rounded-md bg-surface-2" />
            ) : sessions.length === 0 ? (
              <p className="py-3 text-[12px] text-ink-muted">No active sessions were found.</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">{session.userAgent || 'Unknown browser'}</p>
                    <p className="text-[10.5px] text-ink-muted">
                      Started {formatDate(session.createdAt)} · expires {formatDate(session.expiresAt)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revoke(session.id)}>
                    Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding="lg" className="mt-5 border-[color:var(--negative)]/25">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-negative-soft text-[color:var(--negative)]">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-ink">Delete account</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                Your conversations are detached and anonymized. This cannot be undone.
              </p>
              <Button size="sm" variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                Delete my account
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteText('');
        }}
        title="Delete your account?"
        description="This permanently removes your profile and signs you out everywhere."
        size="sm"
        icon={<ShieldAlert className="h-4 w-4" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleteText !== 'DELETE'} loading={deleting} onClick={confirmDelete}>
              Delete account
            </Button>
          </>
        }
      >
        <label htmlFor="delete-confirm" className="block text-[12px] font-medium text-ink-secondary">
          Type <span className="font-bold text-ink">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          value={deleteText}
          onChange={(event) => setDeleteText(event.target.value)}
          autoComplete="off"
          className="mt-2 h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3.5 text-[13px] text-ink outline-none focus:border-[color:var(--negative)]"
        />
      </Dialog>
    </div>
  );
}
