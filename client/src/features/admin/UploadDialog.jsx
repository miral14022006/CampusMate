import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { api } from '../../services/api';
import { localDateISO } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/cn';

const DOC_TYPES = [
  { value: 'notice', label: 'Notice' },
  { value: 'circular', label: 'Circular' },
  { value: 'calendar', label: 'Academic calendar' },
  { value: 'handbook', label: 'Handbook' },
  { value: 'general', label: 'General' }
];

const DEPARTMENTS = [
  'Examination Cell',
  'Accounts & Fees',
  'Hostel Administration',
  'Academic Office',
  'Library',
  'Student Affairs',
  'General Administration'
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

const inputClass =
  'h-10 w-full rounded-pill border border-hairline bg-surface-2 px-3.5 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent';

export function UploadDialog({ open, onClose, onUploaded }) {
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [topicKey, setTopicKey] = useState('');
  const [docType, setDocType] = useState('notice');
  const [department, setDepartment] = useState('Examination Cell');
  const [effectiveDate, setEffectiveDate] = useState(() => localDateISO());
  const [progress, setProgress] = useState({});
  const [statuses, setStatuses] = useState({});
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setTitle('');
    setTopicKey('');
    setDocType('notice');
    setDepartment('Examination Cell');
    setEffectiveDate(localDateISO());
    setProgress({});
    setStatuses({});
    setUploading(false);
    setDone(false);
    setError(null);
  }, [open]);

  const primaryTitle = useMemo(() => {
    if (title.trim()) return title.trim();
    if (files.length === 1) return files[0].name.replace(/\.[a-z0-9]+$/i, '');
    return '';
  }, [title, files]);

  const canUpload = files.length > 0 && (files.length > 1 || Boolean(primaryTitle)) && !uploading;

  const onSubmit = async () => {
    if (!canUpload) return;
    setUploading(true);
    setError(null);
    const successes = [];
    const failures = [];

    for (const file of files) {
      const itemTitle = files.length === 1 ? primaryTitle : file.name.replace(/\.[a-z0-9]+$/i, '');
      const itemTopic = files.length === 1 ? topicKey.trim() || slugify(itemTitle) : slugify(itemTitle);

      setProgress((current) => ({ ...current, [file.name]: 1 }));
      setStatuses((current) => ({ ...current, [file.name]: 'Uploading…' }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', itemTitle);
      formData.append('topic_key', itemTopic);
      formData.append('doc_type', docType);
      formData.append('department', department);
      formData.append('effective_date', new Date(`${effectiveDate}T00:00:00`).toISOString());

      try {
        await api.admin.documents.upload(formData, (pct) => {
          setProgress((current) => ({ ...current, [file.name]: Math.min(98, pct) }));
        });
        setStatuses((current) => ({ ...current, [file.name]: 'Indexing…' }));
        setProgress((current) => ({ ...current, [file.name]: 99 }));
        await new Promise((resolve) => setTimeout(resolve, 700));
        setStatuses((current) => ({ ...current, [file.name]: 'Active · indexed' }));
        setProgress((current) => ({ ...current, [file.name]: 100 }));
        successes.push(file.name);
      } catch (err) {
        setStatuses((current) => ({ ...current, [file.name]: 'Failed' }));
        failures.push(`${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setDone(true);

    if (successes.length) {
      toast({
        title: `${successes.length} document${successes.length > 1 ? 's' : ''} uploaded`,
        description: 'Indexed and ready for search. Cache invalidated.',
        variant: 'success'
      });
      onUploaded?.();
    }
    if (failures.length) {
      setError(failures.join(' '));
      toast({ title: 'Some uploads failed', description: failures[0], variant: 'error', duration: 7000 });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? () => {} : onClose}
      title="Upload document"
      description="PDFs, Word files, text or scanned images. Previous versions of the same topic are superseded automatically."
      icon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
      size="lg"
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              loading={uploading}
              disabled={!canUpload}
              leftIcon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
            >
              {files.length > 1 ? `Upload ${files.length} files` : 'Upload & index'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <FileDropzone
          files={files}
          progress={progress}
          statuses={statuses}
          onFiles={(next) => {
            setDone(false);
            setStatuses({});
            setProgress({});
            setFiles(next);
            if (next.length === 1 && !title) setTitle(next[0].name.replace(/\.[a-z0-9]+$/i, ''));
          }}
          onError={(message) => toast({ title: 'File not accepted', description: message, variant: 'error' })}
          multiple
          disabled={uploading || done}
        />

        {done && files.length > 0 ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-sm px-3 py-2.5 text-[12px] font-medium',
              error ? 'bg-warn-soft text-[color:var(--warning)]' : 'bg-positive-soft text-[color:var(--positive)]'
            )}
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {error ? 'Finished with some errors — see file statuses above.' : 'All files uploaded, indexed and active.'}
          </div>
        ) : null}

        <AnimatePresence>
          {error && done ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-sm bg-negative-soft px-3 py-2 text-[11.5px] text-[color:var(--negative)]"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="doc-title" className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">
              Document title {files.length > 1 ? <span className="font-normal text-ink-muted">(each file uses its own name)</span> : null}
            </label>
            <input
              id="doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={files.length > 1 || uploading || done}
              placeholder="Exam Notice 2025"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="doc-topic" className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">
              Topic key
            </label>
            <input
              id="doc-topic"
              value={topicKey}
              onChange={(event) => setTopicKey(event.target.value)}
              disabled={files.length > 1 || uploading || done}
              placeholder={primaryTitle ? slugify(primaryTitle) : 'exam_schedule'}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-ink-muted">Re-uploading the same key creates a new version.</p>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">Type</span>
            <Select
              value={docType}
              onChange={setDocType}
              options={DOC_TYPES}
              label="Document type"
              disabled={uploading || done}
              className="w-full [&>button]:w-full"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">Department</span>
            <Select
              value={department}
              onChange={setDepartment}
              options={DEPARTMENTS.map((item) => ({ value: item, label: item }))}
              label="Department"
              disabled={uploading || done}
              className="w-full [&>button]:w-full"
            />
          </div>

          <div>
            <label htmlFor="doc-effective" className="mb-1.5 block text-[11px] font-semibold text-ink-secondary">
              Effective date
            </label>
            <input
              id="doc-effective"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              disabled={uploading || done}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-sm bg-surface-2 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-muted">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          Uploads are checksum-deduplicated, chunked and sent to the NLP index. The server cache is flushed automatically.
        </div>
      </div>
    </Dialog>
  );
}

export default UploadDialog;
