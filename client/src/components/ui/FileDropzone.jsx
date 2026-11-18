import { useId, useRef, useState } from 'react';
import { Check, FileText, UploadCloud } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatFileSize } from '../../lib/format';

function ProgressRing({ value = 0, size = 28 }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 200ms cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
}

export function FileDropzone({
  accept = '.pdf,.docx,.txt,.png,.jpg,.jpeg',
  multiple = false,
  maxSizeMB = 15,
  onFiles,
  onError,
  files = [],
  progress = {},
  statuses = {},
  disabled = false,
  className = ''
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const extensions = accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const validate = (fileList) => {
    const valid = [];
    for (const file of fileList) {
      const name = file.name.toLowerCase();
      const matches = extensions.some((ext) =>
        ext.startsWith('.') ? name.endsWith(ext) : file.type.includes(ext)
      );
      if (!matches) {
        onError?.(`${file.name}: unsupported file type. Allowed: ${accept}`);
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError?.(`${file.name}: file is larger than ${maxSizeMB}MB.`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length) onFiles?.(multiple ? valid : [valid[0]]);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    validate(Array.from(event.dataTransfer.files || []));
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-5 py-8 text-center transition-colors duration-150',
          dragging
            ? 'border-accent bg-accent-soft'
            : 'border-[color:var(--border-strong)] bg-surface-2 hover:border-accent hover:bg-accent-soft',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="mt-3 text-[13px] font-semibold text-ink">
          Drag & drop, or <span className="text-accent">browse files</span>
        </span>
        <span className="mt-1 text-[11.5px] text-ink-muted">
          PDF, DOCX, TXT or scanned PNG/JPG · up to {maxSizeMB}MB
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            validate(Array.from(event.target.files || []));
            event.target.value = '';
          }}
        />
      </label>

      {files.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {files.map((file) => {
            const pct = progress[file.name] ?? 0;
            const done = pct >= 100;
            return (
              <li
                key={file.name}
                className="flex items-center gap-3 rounded-sm border border-hairline bg-surface-2 px-3 py-2.5"
              >
                <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">{file.name}</span>
                  <span className="text-[11px] text-ink-muted">
                    {statuses[file.name] || formatFileSize(file.size)}
                  </span>
                </span>
                {done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-positive-soft text-[color:var(--positive)]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="relative flex items-center justify-center">
                    <ProgressRing value={pct} />
                    <span className="absolute text-[8px] font-bold tabular text-ink-secondary">
                      {Math.round(pct)}
                    </span>
                  </span>
                )}
                {!done && pct === 0 ? (
                  <span className="sr-only">Waiting to upload</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default FileDropzone;
