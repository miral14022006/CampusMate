import { useEffect, useState } from 'react';
import { Check, LogOut, Mail, Pencil, Shield, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';

import { useToast } from '../components/ui/Toast';
import { useAdminAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../lib/hooks';
import { initials } from '../lib/format';

const PROFILE_KEY = 'campusmate_admin_profile';
const LANGUAGE_KEY = 'campusmate_language';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'hi-Latn', label: 'Hinglish' },
  { value: 'gu-Latn', label: 'Gujlish' }
];

function readProfile(user) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || 'null');
    if (stored?.name) return stored;
  } catch {
    /* ignore malformed storage */
  }
  return {
    name: user?.name || user?.username || 'Student User',
    email: user?.email || `${user?.username || 'admin'}@pdeu.ac.in`
  };
}

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, logout } = useAdminAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(() => readProfile(user));
  const [language, setLanguage] = useState(() => {
    try {
      return window.localStorage.getItem(LANGUAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* private mode */
    }
  }, [language]);

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftEmail(profile.email);
    setEditOpen(true);
  };

  const saveProfile = () => {
    if (!draftName.trim() || !draftEmail.trim()) {
      toast({ title: 'Name and email are required.', variant: 'error' });
      return;
    }
    const next = { name: draftName.trim(), email: draftEmail.trim() };
    setProfile(next);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    setEditOpen(false);
    toast({
      title: 'Profile saved locally',
      description: 'The admin API does not expose profile updates yet.',
      variant: 'success'
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your preferences" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} size="xl" className="ring-2 ring-[color:var(--accent-ring)] ring-offset-2 ring-offset-[color:var(--surface-1)]" />
              <div className="min-w-0">
                <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-ink">{profile.name}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink-muted">
                  <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {profile.email}
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold capitalize text-accent">
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  {user?.role || 'admin'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Edit Profile
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-hairline pt-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">Username</p>
              <p className="mt-1 truncate text-[12.5px] font-medium text-ink">{user?.username || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">Session</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--positive)]" aria-hidden="true" />
                Active · 24h JWT
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-ink">Preferences</h2>
          <p className="mt-1 text-[12px] text-ink-muted">Saved on this device. No account server sync yet.</p>

          <div className="mt-5 divide-y divide-[color:var(--border)]">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-[13px] font-medium text-ink">Language</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Default language for the assistant interface</p>
              </div>
              <Select
                value={language}
                onChange={(value) => {
                  setLanguage(value);
                  toast({ title: `Language set to ${LANGUAGES.find((item) => item.value === value)?.label}`, variant: 'success', duration: 2200 });
                }}
                options={LANGUAGES}
                label="Interface language"
                size="sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-sm bg-surface-2 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-muted">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            Language applies instantly. Reduced-motion settings are inherited from your operating system.
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-surface-2 text-ink-secondary">
              <User className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Admin session</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                Signing out clears the JWT from this browser. The server token remains valid until expiry.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              logout();
              window.location.assign('/admin/login');
            }}
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          >
            Log out
          </Button>
        </div>
      </Card>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        description="This build stores the profile on this device only."
        icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProfile}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">
              Full name
            </label>
            <input
              id="settings-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3.5 text-[12.5px] text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              className="h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3.5 text-[12.5px] text-ink outline-none focus:border-accent"
            />
          </div>
          <p className="text-[10.5px] leading-relaxed text-ink-muted">
            Avatar initials update automatically from the name ({initials(draftName || profile.name)}). The admin user
            record on the server is not modified.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
