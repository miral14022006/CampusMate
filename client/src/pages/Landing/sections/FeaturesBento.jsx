import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  Brain,
  CalendarCheck,
  FileCheck2,
  GitBranch,
  HelpCircle,
  Languages,
  ScanText,
  Search
} from 'lucide-react';
import Scene from '../components/Scene';
import { BENTO_FEATURES } from '../../../config/landing';
import { EASE } from '../../../lib/motion';

const ICON_MAP = {
  'hybrid-retrieval': Search,
  multilingual: Languages,
  'page-citations': FileCheck2,
  'ocr-engine': ScanText,
  'smart-clarification': HelpCircle,
  'conversation-memory': Brain,
  versioning: GitBranch,
  'calendar-reminders': CalendarCheck
};

function FeatureCard({ item, index = 0 }) {
  const cardRef = useRef(null);
  const Icon = ICON_MAP[item.id] || Search;

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mx', `${x}px`);
    cardRef.current.style.setProperty('--my', `${y}px`);
  };

  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y: 32, scale: 0.96 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.55,
            ease: EASE,
            delay: (index % 4) * 0.08
          }
        }
      }}
      whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.25, ease: EASE } }}
      className="h-full"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="group relative flex h-full flex-col justify-between rounded-2xl bg-surface-1/90 border border-hairline hover:border-[color:var(--border-strong)] transition-all p-5 sm:p-6 overflow-hidden shadow-lift"
        style={{
          '--mx': '-200px',
          '--my': '-200px'
        }}
      >
        {/* Cursor Spotlight via CSS variables */}
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx) var(--my), rgba(212, 103, 63, 0.14), transparent 70%)'
          }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent group-hover:bg-accent group-hover:text-white transition-colors">
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="inline-flex rounded-pill border border-hairline bg-surface-2 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              {item.tag}
            </span>
          </div>

          <h3 className="mt-4 text-[17px] font-semibold text-ink group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
            {item.description}
          </p>
        </div>

        {item.link ? (
          <div className="relative z-10 mt-5 pt-3.5 border-t border-hairline">
            <Link
              to={item.link}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent hover:underline outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
            >
              {item.linkText}
            </Link>
          </div>
        ) : null}
      </div>
    </m.div>
  );
}

export function FeaturesBento() {
  return (
    <Scene
      id="features"
      eyebrow="Intelligent Infrastructure"
      title="Built around how campus really works."
      subtitle="Official circulars are scattered, scanned, and multilingual. Here is the engineering that turns them into verified answers."
      glowPosition="top-right"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 w-full">
        {BENTO_FEATURES.map((item, idx) => (
          <FeatureCard key={item.id} item={item} index={idx} />
        ))}
      </div>
    </Scene>
  );
}

export default FeaturesBento;
