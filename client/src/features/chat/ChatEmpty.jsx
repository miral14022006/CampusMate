import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import { fadeUp, staggerContainer } from '../../lib/motion';

const SUGGESTIONS = [
  { lang: 'English', text: 'When is the exam registration deadline?' },
  { lang: 'English', text: 'How do I pay my semester fee online?' },
  { lang: 'हिन्दी', text: 'परीक्षा पंजीकरण की अंतिम तिथि कब है?', indic: 'devanagari' },
  { lang: 'ગુજરાતી', text: 'પરીક્ષા નોંધણીની છેલ્લી તારીખ કઈ છે?', indic: 'gujarati' },
  { lang: 'Hinglish', text: 'Exam form bharne ki last date kya hai?' },
  { lang: 'Gujlish', text: 'Exam form bharva ni last date kai chhe?' }
];

export function ChatEmpty({ onPick }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div
          className="absolute inset-0 -z-10 scale-[2.4] rounded-full opacity-40 blur-[60px]"
          style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
          aria-hidden="true"
        />
        <Logo variant="mark" size="xl" className="drop-shadow-[0_18px_40px_rgba(212,103,63,.35)]" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-[26px] font-semibold tracking-[-0.035em] text-ink sm:text-[30px]"
      >
        Namaste. What can I find for you?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-secondary"
      >
        Ask about notices, exams, fees, hostels and more — in English, Hindi, Gujarati, Hinglish or Gujlish.
      </motion.p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-8 grid w-full max-w-2xl gap-2.5 sm:grid-cols-2"
      >
        {SUGGESTIONS.map((suggestion) => (
          <motion.button
            key={suggestion.text}
            variants={fadeUp}
            type="button"
            onClick={() => onPick?.(suggestion.text)}
            className="group flex items-start justify-between gap-3 rounded-md border border-hairline bg-surface-1 px-4 py-3.5 text-left transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-[color:var(--accent-ring)] hover:bg-surface-2"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                {suggestion.lang}
              </span>
              <span
                className={`mt-1 block text-[12.5px] leading-snug text-ink-secondary group-hover:text-ink ${
                  suggestion.indic === 'devanagari'
                    ? 'font-devanagari'
                    : suggestion.indic === 'gujarati'
                      ? 'font-gujarati'
                      : ''
                }`}
              >
                {suggestion.text}
              </span>
            </span>
            <ArrowUpRight
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted transition-colors group-hover:text-accent"
              aria-hidden="true"
            />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

export default ChatEmpty;
