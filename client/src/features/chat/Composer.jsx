import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, Mic, MicOff, Send } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { cn } from '../../lib/cn';
import { detectLanguage, languagePillLabel } from './detectLanguage';

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const Composer = forwardRef(function Composer({ onSend, disabled = false, offline = false }, ref) {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const detected = detectLanguage(value);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    get value() {
      return value;
    }
  }));

  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    setValue('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const toggleMic = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang =
      detected === 'hi' ? 'hi-IN' : detected === 'gu' || detected === 'gu-Latn' ? 'gu-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        setValue((current) => (current ? `${current} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-[26px] border border-hairline bg-surface-1 p-2 pl-4 shadow-soft transition-colors focus-within:border-[color:var(--accent-ring)]',
          offline && 'border-[color:var(--warning)]'
        )}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-composer" className="sr-only">
            Type your question
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Type your question…"
            className={cn(
              'max-h-40 min-h-[40px] flex-1 resize-none self-center bg-transparent py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:opacity-60',
              (detected === 'hi' || detected === 'gu') && 'indic'
            )}
          />

          {SpeechRecognition ? (
            <Tooltip label={listening ? 'Stop listening' : 'Speak your question'} side="top">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={listening}
                className={cn(
                  'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                  listening
                    ? 'bg-negative-soft text-[color:var(--negative)]'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                )}
              >
                {listening ? (
                  <MicOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          ) : null}

          <motion.button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send question"
            whileTap={canSend ? { scale: 0.92 } : undefined}
            animate={{ scale: canSend ? 1 : 0.92, opacity: canSend ? 1 : 0.45 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors',
              canSend
                ? 'bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] shadow-[0_8px_20px_-12px_rgba(212,103,63,.9)]'
                : 'cursor-not-allowed bg-surface-3 text-ink-muted'
            )}
          >
            <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </motion.button>
        </div>

        <div className="flex min-h-[16px] items-center gap-2 px-1 pb-1 pt-0.5">
          {detected ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[9.5px] font-semibold text-accent">
              <Languages className="h-2.5 w-2.5" aria-hidden="true" />
              {languagePillLabel(detected)}
            </span>
          ) : (
            <span className="text-[9.5px] text-ink-muted">Enter to send · Shift+Enter for a new line</span>
          )}
          {detected ? (
            <span className="hidden text-[9.5px] text-ink-muted sm:inline">Enter to send</span>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default Composer;
