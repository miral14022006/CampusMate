import { useState } from 'react';
import { Copy, Check, Calendar as CalendarIcon, ExternalLink, Rss } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

export function SubscribeDialog({ open, onClose, semester }) {
  const [copied, setCopied] = useState(false);
  const feedUrl = `${window.location.origin}/api/calendar/feed.ics${semester && semester !== 'all' ? `?semester=${semester}` : ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Subscribe to Academic Calendar Feed"
      description="Stay synchronized with the latest notices, exam schedules, and deadlines automatically."
      icon={<Rss className="h-5 w-5 text-accent" />}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            Live iCal Subscription URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={feedUrl}
              className="flex-1 rounded-sm border border-hairline bg-surface-2 px-3 py-2 font-mono text-[12px] text-ink select-all outline-none"
            />
            <Button
              size="sm"
              variant={copied ? 'primary' : 'outline'}
              onClick={handleCopy}
              leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface-1 p-3 space-y-3">
          <div className="font-semibold text-ink text-[12.5px] flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-accent" /> How to Subscribe
          </div>

          <div className="space-y-2 text-ink-secondary">
            <div>
              <strong className="text-ink">Google Calendar:</strong>
              <p className="mt-0.5 text-ink-muted leading-relaxed">
                Go to Google Calendar web → In the left sidebar, click the <strong>+</strong> next to "Other calendars" → Choose <strong>From URL</strong> → Paste the link above and click "Add calendar".
              </p>
            </div>

            <div>
              <strong className="text-ink">Apple Calendar (Mac & iOS):</strong>
              <p className="mt-0.5 text-ink-muted leading-relaxed">
                Open Calendar → File → <strong>New Calendar Subscription...</strong> → Paste the URL and choose your auto-refresh frequency.
              </p>
            </div>

            <div>
              <strong className="text-ink">Outlook Calendar:</strong>
              <p className="mt-0.5 text-ink-muted leading-relaxed">
                Select Add Calendar → <strong>Subscribe from web</strong> → Paste the URL and name your calendar.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-ink-muted italic border-t border-hairline pt-2">
          Note: Google Calendar refreshes subscribed web feeds on its own schedule (usually every 12 to 24 hours).
        </p>
      </div>
    </Dialog>
  );
}

export default SubscribeDialog;
