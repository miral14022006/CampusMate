import { useState } from 'react';
import { Bell, FileText, Inbox, Layers, Pencil, Trash2, UploadCloud } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { Badge, StatusPill } from '../components/ui/Badge';
import { Card, CardHeader } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton, SkeletonText, SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Tooltip } from '../components/ui/Tooltip';
import { Switch } from '../components/ui/Switch';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { Dialog } from '../components/ui/Dialog';
import { Drawer } from '../components/ui/Drawer';
import { StatCard } from '../components/ui/StatCard';
import { FileDropzone } from '../components/ui/FileDropzone';
import { useToast } from '../components/ui/Toast';
import { useDocumentTitle } from '../lib/hooks';

const SELECT_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '90', label: 'Last 90 days' }
];

function Section({ title, description, children }) {
  return (
    <section className="border-t border-hairline py-8 first:border-0 first:pt-0">
      <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-[11.5px] text-ink-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ThemePanel({ theme, openDialog, openDrawer }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [selectValue, setSelectValue] = useState('30');
  const [switchOn, setSwitchOn] = useState(theme === 'dark');
  const [fileProgress, setFileProgress] = useState({});
  const [files, setFiles] = useState([]);

  return (
    <section
      data-theme={theme}
      className="rounded-lg border border-hairline bg-page p-5 text-ink shadow-soft sm:p-7"
      aria-label={`${theme} theme components`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Theme</p>
          <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] capitalize">{theme}</h2>
        </div>
        <span className="rounded-pill bg-surface-2 px-3 py-1 text-[10.5px] font-medium text-ink-muted">
          data-theme=&quot;{theme}&quot;
        </span>
      </div>

      <Section title="Brand (Original Concentric Arcs Mark at 16, 32, 64, 256px)">
        <div className="flex flex-wrap items-end gap-8">
          <Logo size="xl" />
          <Logo size="md" />
          <Logo variant="mark" size={256} />
          <Logo variant="mark" size={64} />
          <Logo variant="mark" size={32} />
          <Logo variant="mark" size={16} />
          <Logo variant="mark" size={48} oneColor color="#d4673f" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outlined accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Edit" variant="secondary">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" leftIcon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}>
            Upload
          </Button>
        </div>
      </Section>

      <Section title="Badges & chips">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="accent" dot>Accent</Badge>
          <Badge variant="positive" dot>Positive</Badge>
          <Badge variant="negative" dot>Negative</Badge>
          <Badge variant="warning" dot>Needs Review</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill status="active" />
          <StatusPill status="pending" />
          <StatusPill status="negative" />
          <StatusPill status="superseded" />
          <Chip onClick={() => {}}>Fee details?</Chip>
          <Chip active onClick={() => {}}>Exam schedule?</Chip>
          <Chip onRemove={() => {}}>Hostel rules?</Chip>
        </div>
      </Section>

      <Section title="Stats">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={<Layers className="h-[18px] w-[18px]" aria-hidden="true" />} label="Total Queries" value={125400} format={(v) => `${(v / 1000).toFixed(1)}K`} delta={12} />
          <StatCard icon={<Bell className="h-[18px] w-[18px]" aria-hidden="true" />} label="Avg Response" value={620} format={(v) => `${Math.round(v)}ms`} delta={-8} positiveIsGood={false} />
          <SkeletonCard />
        </div>
      </Section>

      <Section title="Tabs, select, switch">
        <div className="flex flex-wrap items-center gap-5">
          <Tabs
            items={[
              { value: 'all', label: 'All', count: 24 },
              { value: 'positive', label: 'Positive', count: 18 },
              { value: 'negative', label: 'Negative', count: 6 }
            ]}
            value={tab}
            onChange={setTab}
            label="Demo tabs"
          />
          <Select value={selectValue} onChange={setSelectValue} options={SELECT_OPTIONS} label="Demo select" />
          <div className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <Switch checked={switchOn} onChange={setSwitchOn} label="Demo switch" />
            Switch
          </div>
          <Tooltip label="Tooltip on top" side="top">
            <Button variant="secondary" size="sm">Hover me</Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="Cards, avatar, empty state">
        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader title="Exam Notice 2025" description="Indexed · version 3" icon={<FileText className="h-4 w-4" aria-hidden="true" />} />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              Same surface tokens, border and radius across both themes.
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name="Miral Patel" size="lg" status="online" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Miral Patel</p>
                <p className="text-[11px] text-ink-muted">Admin · online</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Avatar size="xs" name="A" />
              <Avatar size="sm" icon />
              <Avatar size="md" name="Campus Mate" />
            </div>
          </Card>
          <Card padding="none">
            <EmptyState
              compact
              icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
              title="Nothing here"
              description="Empty-state pattern for tables and queues."
              action={<Button size="sm" variant="outline">Action</Button>}
            />
          </Card>
        </div>
      </Section>

      <Section title="Table">
        <Table caption="Demo documents table">
          <THead>
            <TR className="hover:bg-transparent">
              <TH>File Name</TH>
              <TH>Type</TH>
              <TH>Uploaded</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {[
              ['Exam Notice 2025.pdf', 'PDF', 'Apr 15, 2025', 'active'],
              ['Fee Circular.pdf', 'PDF', 'Apr 12, 2025', 'indexing'],
              ['Hostel Rules.pdf', 'PDF', 'Apr 02, 2025', 'superseded']
            ].map(([name, type, date, status]) => (
              <TR key={name}>
                <TD>
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
                    {name}
                  </span>
                </TD>
                <TD>{type}</TD>
                <TD>{date}</TD>
                <TD><StatusPill status={status} /></TD>
                <TD align="right">
                  <button type="button" className="rounded-full p-1.5 text-ink-muted hover:bg-negative-soft hover:text-[color:var(--negative)]" aria-label={`Delete ${name}`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>

      <Section title="Upload, skeletons, overlays">
        <div className="grid gap-4 lg:grid-cols-2">
          <FileDropzone
            files={files}
            progress={fileProgress}
            onFiles={(next) => {
              setFiles(next);
              setFileProgress(Object.fromEntries(next.map((file) => [file.name, 45])));
            }}
            onError={(message) => toast({ title: 'File not accepted', description: message, variant: 'error' })}
            maxSizeMB={10}
          />
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-2/3" />
            <SkeletonText lines={3} />
            <Skeleton variant="pill" className="h-9 w-40" />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={openDialog}>Open dialog</Button>
              <Button size="sm" variant="secondary" onClick={openDrawer}>Open drawer</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toast({ title: 'Toast title', description: 'A success toast with description.', variant: 'success' })}
              >
                Toast
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </section>
  );
}

export default function DevUI() {
  useDocumentTitle('Component gallery');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1360px] px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Development only</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-ink">Component gallery</h1>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            Every UI primitive rendered in both token sets. Not linked in production navigation.
          </p>
        </div>
        <a href="/" className="text-[12px] font-semibold text-accent hover:underline">
          Back to landing
        </a>
      </div>

      <div className="mt-8 space-y-5">
        <ThemePanel theme="dark" openDialog={() => setDialogOpen(true)} openDrawer={() => setDrawerOpen(true)} />
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Dialog primitive"
        description="Focus trapped, Escape closes, focus returns to the trigger."
        icon={<Inbox className="h-4 w-4" aria-hidden="true" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Overlay uses the scrim token and the panel uses surface-1 with a hairline border.
        </p>
      </Dialog>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Drawer primitive"
        description="Slides in from the right with focus management."
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        footer={<Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>}
      >
        <div className="space-y-3 text-[12.5px] leading-relaxed text-ink-secondary">
          <p>Used for document details, feedback review and other contextual inspection.</p>
          <div className="rounded-sm border border-hairline bg-surface-2 p-3">Detail row content</div>
        </div>
      </Drawer>
    </div>
  );
}
