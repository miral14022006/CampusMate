import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, FileText, ThumbsDown, ThumbsUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/brand/Logo';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { AddToCalendarButton } from '../calendar/AddToCalendarButton';
import { cn } from '../../lib/cn';
import { usePrefersReducedMotion } from '../../lib/hooks';
import { useOnClickOutside } from '../../lib/hooks';
import { messageEntrance, popover } from '../../lib/motion';

function useTypewriter(text, animate) {
  const reduced = usePrefersReducedMotion();
  const words = useMemo(() => String(text || '').split(/(\s+)/), [text]);
  const [visible, setVisible] = useState(() => (animate && !reduced ? '' : text));

  useEffect(() => {
    if (!animate || reduced) {
      setVisible(text);
      return undefined;
    }
    let index = 0;
    setVisible('');
    const interval = setInterval(() => {
      index += 2;
      setVisible(words.slice(0, index).join(''));
      if (index >= words.length) clearInterval(interval);
    }, 24);
    return () => clearInterval(interval);
  }, [animate, reduced, text, words]);

  return { visible, done: visible === text };
}

const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-2 text-[13.5px] leading-[1.7] last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-accent underline decoration-accent underline-offset-2 hover:decoration-accent"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-ink">{children}</code>
    ) : (
      <code className="block overflow-x-auto rounded-sm bg-surface-2 p-3 font-mono text-[12px] text-ink">{children}</code>
    ),
  h1: ({ children }) => <p className="mb-2 mt-3 text-[15px] font-semibold text-ink">{children}</p>,
  h2: ({ children }) => <p className="mb-2 mt-3 text-[14px] font-semibold text-ink">{children}</p>,
  h3: ({ children }) => <p className="mb-1.5 mt-2 text-[13.5px] font-semibold text-ink">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-accent pl-3 text-ink-secondary">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-hairline" />
};

function CitationChip({ citation, index }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useOnClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const docLabel = citation.doc_name || citation.docName || `Source ${index + 1}`;
  const page = citation.page ?? citation.page_number;
  const docId =
    citation.docId ||
    citation.doc_id ||
    citation.documentId ||
    citation.document_id ||
    citation.doc_name ||
    citation.docName;
  const viewerPath = docId
    ? `/documents/${encodeURIComponent(docId)}${page ? `?page=${encodeURIComponent(page)}` : ''}`
    : null;

  const openDocument = () => {
    if (!viewerPath) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      window.open(viewerPath, '_blank', 'noopener,noreferrer');
    } else {
      navigate(viewerPath);
    }
    setOpen(false);
  };

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-[color:var(--border-strong)] px-2.5 py-1 text-[10.5px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
      >
        <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="truncate">
          Source: {docLabel}
          {page !== undefined && page !== null ? ` (Page ${page})` : ''}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={`Source preview: ${docLabel}`}
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute bottom-[calc(100%+8px)] left-0 z-30 w-[min(320px,80vw)] rounded-md border border-hairline bg-surface-2 p-3 shadow-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11.5px] font-semibold text-ink">
                {docLabel}
                {page !== undefined && page !== null ? ` · Page ${page}` : ''}
              </p>
              {citation.score !== undefined ? (
                <span className="shrink-0 text-[10px] text-ink-muted">{Math.round(citation.score * 100)}% match</span>
              ) : null}
            </div>
            <p className="mt-1.5 max-h-40 overflow-y-auto text-[11.5px] leading-relaxed text-ink-secondary">
              {citation.snippet || citation.text || 'No preview text is available for this citation.'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              {viewerPath ? (
                <button
                  type="button"
                  onClick={openDocument}
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Open document{page ? ` at page ${page}` : ''}
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[10.5px] font-semibold text-ink-muted hover:text-ink hover:underline"
              >
                Close
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

function FeedbackControls({ message, onFeedback, onToast }) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('not helpful');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setReasonOpen(false), reasonOpen);

  const submitUp = async () => {
    if (message.feedback === 'up') return;
    try {
      await onFeedback(message, 'up');
      onToast?.('Thanks for the feedback.', 'success');
    } catch {
      onToast?.('Could not save your feedback.', 'error');
    }
  };

  const submitDown = async () => {
    setBusy(true);
    try {
      await onFeedback(message, 'down', { reason, comment });
      onToast?.('Thanks — we will review this answer.', 'success');
      setReasonOpen(false);
      setComment('');
    } catch {
      onToast?.('Could not save your feedback.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative flex items-center gap-0.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={submitUp}
        aria-label="Helpful answer"
        aria-pressed={message.feedback === 'up'}
        className={cn(
          'rounded-full p-1.5 transition-colors',
          message.feedback === 'up'
            ? 'bg-accent-soft text-accent'
            : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setReasonOpen((value) => !value)}
        aria-label="Not helpful answer"
        aria-pressed={message.feedback === 'down'}
        aria-expanded={reasonOpen}
        className={cn(
          'rounded-full p-1.5 transition-colors',
          message.feedback === 'down'
            ? 'bg-negative-soft text-[color:var(--negative)]'
            : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {reasonOpen ? (
          <motion.div
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute bottom-[calc(100%+8px)] right-0 z-30 w-[260px] rounded-md border border-hairline bg-surface-2 p-3 shadow-lift"
          >
            <p className="text-[11.5px] font-semibold text-ink">What went wrong?</p>
            <div className="mt-2 space-y-1">
              {['wrong answer', 'outdated', 'wrong language', 'not helpful', 'other'].map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-[6px] px-1.5 py-1 text-[11.5px] capitalize text-ink-secondary hover:bg-surface-3"
                >
                  <input
                    type="radio"
                    name={`reason-${message.id}`}
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="h-3 w-3 accent-[color:var(--accent)]"
                  />
                  {option}
                </label>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="Optional detail…"
              className="mt-2 w-full resize-none rounded-sm border border-hairline bg-surface-1 px-2 py-1.5 text-[11.5px] text-ink outline-none focus:border-accent"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setReasonOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={busy} onClick={submitDown}>
                Send
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function MessageBubble({ message, onFeedback, onToast, reducedMotion }) {
  const [copied, setCopied] = useState(false);
  const { visible, done } = useTypewriter(message.text, Boolean(message.isNew) && !reducedMotion);
  const indic = message.language === 'hi' || message.language === 'gu';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      onToast?.('Answer copied.', 'success');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onToast?.('Could not copy to clipboard.', 'error');
    }
  };

  if (message.role === 'user') {
    return (
      <motion.div
        variants={messageEntrance}
        initial="hidden"
        animate="show"
        className="flex items-start justify-end gap-2"
      >
        <div
          className={cn(
            'max-w-[85%] rounded-[18px] rounded-br-md bg-surface-2 px-4 py-2.5 text-[13.5px] leading-relaxed text-ink sm:max-w-[75%]',
            indic && 'indic'
          )}
        >
          {message.text}
        </div>
        <Avatar icon size="sm" className="mt-0.5" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageEntrance}
      initial="hidden"
      animate="show"
      className="group flex items-start gap-2.5"
    >
      <Logo variant="mark" size="sm" className="mt-0.5 shrink-0" showTassel={false} />
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <div className="rounded-[18px] rounded-tl-md border border-hairline bg-surface-1 px-4 py-3">
          <div className={cn('text-ink-secondary', indic && 'indic')}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {message.isNew ? visible : message.text}
            </ReactMarkdown>
            {message.isNew ? <span className="sr-only">{message.text}</span> : null}
          </div>

          {message.citations?.length > 0 && done ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {message.citations.map((citation, index) => (
                <CitationChip
                  key={`${citation.citation_id || citation.doc_name || 'cite'}-${index}`}
                  citation={citation}
                  index={index}
                />
              ))}
            </div>
          ) : null}

          {message.calendarEvents?.length > 0 && done ? (
            <div className="mt-3 pt-2.5 border-t border-hairline flex items-center justify-between">
              <AddToCalendarButton events={message.calendarEvents} />
            </div>
          ) : null}

          {message.decision === 'FALLBACK' || message.grounded === false ? (
            <p className="mt-2 text-[10.5px] font-medium text-[color:var(--warning)]">
              This answer may not be grounded in a document. Please verify with the office.
            </p>
          ) : null}
        </div>

        {done ? (
          <div className="mt-1 flex items-center gap-1 pl-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button
              type="button"
              onClick={copy}
              aria-label="Copy answer"
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[color:var(--positive)]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
            {message.messageId ? (
              <FeedbackControls message={message} onFeedback={onFeedback} onToast={onToast} />
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-2.5"
      aria-label="CampusMate is typing"
      role="status"
    >
      <Logo variant="mark" size="sm" className="mt-0.5 shrink-0" showTassel={false} />
      <div className="flex h-10 items-center gap-1.5 rounded-[18px] rounded-tl-md border border-hairline bg-surface-1 px-4">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default MessageBubble;
