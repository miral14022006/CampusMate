import { useEffect, useState } from 'react';
import { Copy, KeyRound, Mail, ShieldCheck, Trash2, UserPlus, UserX, Clock } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Badge, StatusPill } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../components/ui/Table';
import { ErrorState } from './DashboardBits';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function useCountdown(target) {
  const [left, setLeft] = useState(target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!target) return undefined;
    const tick = () => setLeft(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const hours = Math.floor(left / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return left <= 0 ? 'Expired' : `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function OneTimeLink({ link, expiresAt, onClose }) {
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(expiresAt);
  return (
    <div className="space-y-3">
      <p className="rounded-sm border border-[color:var(--warning)]/35 bg-[color:var(--warning-soft)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[color:var(--warning)]">
        This link is shown only once. Copy it now and share it privately with the invited administrator.
      </p>
      <div className="flex items-center gap-2">
        <input readOnly value={link} aria-label="One-time invitation link" className="h-10 min-w-0 flex-1 rounded-pill border border-hairline bg-surface-2 px-3 text-[11px] text-ink" />
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard?.writeText(link);
            setCopied(true);
          }}
          leftIcon={<Copy className="h-3.5 w-3.5" />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Clock className="h-3 w-3" aria-hidden="true" /> Expires in {countdown}
      </p>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

export default function DashboardTeam() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [oneTime, setOneTime] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamResult, inviteResult] = await Promise.allSettled([api.admin.team.list(), api.admin.team.invites()]);
      if (teamResult.status === 'fulfilled') setData(teamResult.value);
      else throw teamResult.reason;
      setInvites(inviteResult.status === 'fulfilled' ? inviteResult.value.invites || [] : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const team = data?.team || data?.admins || [];
  const superadmins = team.filter((member) => member.role === 'superadmin' && member.status === 'active');

  const sendInvite = async (event) => {
    event.preventDefault();
    setInviteError('');
    setInviteBusy(true);
    try {
      const result = await api.admin.team.invite({ name: inviteForm.name.trim(), email: inviteForm.email.trim() });
      setInviteOpen(false);
      setInviteForm({ name: '', email: '' });
      setOneTime({ link: result.inviteLink || result.inviteUrl, expiresAt: result.expiresAt, title: 'Invitation link' });
      load();
    } catch (err) {
      setInviteError(err.message || 'Could not create the invitation.');
    } finally {
      setInviteBusy(false);
    }
  };

  const act = async (type, member) => {
    setMessage('');
    try {
      if (type === 'disable' || type === 'enable') {
        await api.admin.team.setStatus(member.id, type === 'disable' ? 'disabled' : 'active');
        setMessage(`${member.name} ${type === 'disable' ? 'disabled' : 'enabled'}.`);
      }
      if (type === 'reset') {
        const result = await api.admin.team.resetLink(member.id);
        setOneTime({ link: result.resetUrl, expiresAt: result.expiresAt, title: 'Password reset link' });
      }
      if (type === 'remove') {
        await api.admin.team.remove(member.id);
        setMessage(`${member.name} removed.`);
      }
      setConfirm(null);
      load();
    } catch (err) {
      setMessage(err.message || 'Action failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Team</h1>
          <p className="mt-1 text-[12px] text-ink-muted">Administrators who can review content and see usage. Superadmin only.</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
          Invite admin
        </Button>
      </div>

      {message ? (
        <p className="rounded-sm border border-hairline bg-surface-2 px-3 py-2 text-[11.5px] text-ink-secondary" role="status" aria-live="polite">{message}</p>
      ) : null}

      {error ? <ErrorState error={error} onRetry={load} /> : null}

      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-md" />)}</div>
      ) : (
        <Table caption="Administrators">
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Last login</TH>
              <TH>Invited by</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {team.map((member) => {
              const isSelf = String(member.id) === String(user?.id || user?._id);
              const lastSuper = member.role === 'superadmin' && superadmins.length <= 1;
              return (
                <TR key={member.id}>
                  <TD>
                    <span className="font-medium text-ink">{member.name}</span>
                    {isSelf ? <span className="ml-1.5 text-[9px] font-semibold uppercase text-accent">You</span> : null}
                  </TD>
                  <TD>{member.email}</TD>
                  <TD>{member.role === 'superadmin' ? <Badge variant="accent">Superadmin</Badge> : 'Admin'}</TD>
                  <TD><StatusPill status={member.status} /></TD>
                  <TD className="whitespace-nowrap">{fmt(member.lastLoginAt)}</TD>
                  <TD className="text-[11.5px]">{member.invitedBy?.name || '—'}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => act(member.status === 'active' ? 'disable' : 'enable', member)}>
                        {member.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act('reset', member)}>Reset link</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={lastSuper}
                        title={lastSuper ? 'Cannot remove the last superadmin' : undefined}
                        aria-label={lastSuper ? 'Cannot remove the last superadmin' : `Remove ${member.name}`}
                        onClick={() => setConfirm({ type: 'remove', member })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <section className="rounded-lg border border-hairline bg-surface-1 p-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Mail className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" /> Pending invitations
        </h2>
        {invites.length === 0 ? (
          <p className="mt-2 text-[11.5px] text-ink-muted">No pending invitations.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[color:var(--border)]">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-ink">{invite.name} · {invite.email}</p>
                  <p className="text-[10px] text-ink-muted">Expires {fmt(invite.expiresAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await api.admin.team.revokeInvite(invite.id);
                    load();
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite an administrator"
        description="They will set their own password through a one-time link."
        size="sm"
        icon={<UserPlus className="h-4 w-4" />}
        footer={null}
      >
        <form onSubmit={sendInvite} className="space-y-3">
          <div>
            <label htmlFor="invite-name" className="mb-1 block text-[11.5px] font-semibold text-ink-secondary">Full name</label>
            <input id="invite-name" required value={inviteForm.name} onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3 text-[12.5px] text-ink outline-none focus:border-accent" />
          </div>
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-[11.5px] font-semibold text-ink-secondary">Email</label>
            <input id="invite-email" type="email" required value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3 text-[12.5px] text-ink outline-none focus:border-accent" />
          </div>
          {inviteError ? <p className="text-[11px] text-[color:var(--negative)]" role="alert">{inviteError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" loading={inviteBusy} leftIcon={<Mail className="h-3.5 w-3.5" />}>Create invite</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(oneTime)}
        onClose={() => setOneTime(null)}
        title={oneTime?.title || 'One-time link'}
        description="Share this link privately. It cannot be shown again."
        size="sm"
        icon={<KeyRound className="h-4 w-4" />}
      >
        <OneTimeLink link={oneTime?.link || ''} expiresAt={oneTime?.expiresAt} onClose={() => setOneTime(null)} />
      </Dialog>

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Remove this administrator?"
        description={confirm?.member?.name}
        size="sm"
        icon={<UserX className="h-4 w-4" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => act('remove', confirm.member)}>Remove</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Their sessions are revoked immediately. This cannot be undone. The last superadmin cannot be removed.
        </p>
      </Dialog>

      {superadmins.length <= 1 ? (
        <p className="flex items-center gap-1.5 text-[10.5px] text-ink-muted">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> At least one active superadmin is always required.
        </p>
      ) : null}
    </div>
  );
}
