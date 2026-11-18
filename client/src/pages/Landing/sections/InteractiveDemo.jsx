import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence, useInView } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Tag,
  User
} from 'lucide-react';
import Scene from '../components/Scene';
import Logo from '../../../components/brand/Logo';
import { Card } from '../../../components/ui/Card';
import { getLanguageDemos, getCalendarEventData } from '../../../config/landing';
import { DURATION, EASE } from '../../../lib/motion';

const CHECKLIST_ITEMS = [
  'Grounded in official PDEU circulars and academic rules',
  'Source chip with document title and page number on every cited answer',
  'One-click "Add to Calendar" button directly inside date-bearing answers',
  'Follow-up questions preserve multi-turn dialogue context'
];

export function InteractiveDemo() {
  const [demos] = useState(() => getLanguageDemos());
  const [activeTab, setActiveTab] = useState(demos[0].id);
  const [calData] = useState(() => getCalendarEventData());

  const containerRef = useRef(null);
  const inView = useInView(containerRef, { margin: '-40px' });
  const [isHovered, setIsHovered] = useState(false);
  const [chatPhase, setChatPhase] = useState(0);

  const activeDemo = demos.find((d) => d.id === activeTab) || demos[0];

  useEffect(() => {
    if (!inView || isHovered) return undefined;

    setChatPhase(0);
    const t1 = setTimeout(() => {
      setChatPhase(1);
    }, 1100);

    const t2 = setTimeout(() => {
      setChatPhase(0);
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView, isHovered, activeTab]);

  return (
    <Scene
      id="demo"
      eyebrow="Interactive Demo"
      title="See it in action."
      subtitle="Talk the way you think, and inspect answers with direct page-level citations."
      glowPosition="center"
    >
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full"
      >
        {/* Left Column (5/12): Checklist and Language Tabs */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-accent mb-3">
              Select Language format
            </p>
            {/* Language tabs */}
            <div className="flex flex-wrap gap-2 rounded-pill border border-hairline bg-surface-2 p-1.5">
              {demos.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setChatPhase(0);
                    }}
                    className={`relative rounded-pill px-4 py-2 text-[13.5px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent ${
                      isActive ? 'text-white' : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {isActive && (
                      <m.div
                        layoutId="demo-lang-tab"
                        className="absolute inset-0 rounded-pill bg-accent shadow-soft"
                        transition={{ duration: DURATION.base, ease: EASE }}
                      />
                    )}
                    <span className={`relative z-10 ${tab.fontClass}`}>
                      {tab.nativeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Item Grounding Checklist */}
          <ul className="space-y-3.5 pt-2">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-ink-secondary">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 text-[12.5px] text-ink-muted">
            <span className="font-semibold text-accent">Sample notice</span> · Not real PDEU data
          </div>
        </div>

        {/* Right Column (7/12): Interactive Chat Card */}
        <div className="lg:col-span-7 w-full">
          <Card padding="none" className="bg-surface-1/95 border-hairline shadow-lift overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-hairline px-5 py-3.5 bg-surface-2/60">
              <Logo variant="mark" size="md" />
              <div>
                <p className="text-[14px] font-semibold text-ink">CampusMate</p>
                <p className="text-[11.5px] text-ink-muted">Grounded Multilingual Assistant</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-semibold text-accent">
                {activeDemo.badge}
              </span>
            </div>

            {/* Chat Body */}
            <div className="p-5 sm:p-7 space-y-4 min-h-[260px]">
              {/* Student Query */}
              <div className="flex justify-end gap-2.5">
                <div className="max-w-[85%] rounded-[18px] rounded-br-sm bg-surface-2 px-4 py-2.5 text-[14.5px] text-ink shadow-sm">
                  <p className={activeDemo.fontClass}>{activeDemo.question}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-muted text-[12px]">
                  <User className="h-4 w-4" />
                </span>
              </div>

              {/* Bot Response */}
              <AnimatePresence mode="wait">
                {chatPhase === 0 ? (
                  <m.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex justify-start"
                  >
                    <div className="inline-flex items-center gap-2 rounded-[18px] rounded-tl-sm border border-hairline bg-surface-2/60 px-5 py-3.5">
                      <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
                      <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent [animation-delay:300ms]" />
                    </div>
                  </m.div>
                ) : (
                  <m.div
                    key={activeDemo.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="space-y-4"
                  >
                    <div className="max-w-[92%] rounded-[18px] rounded-tl-sm border border-hairline bg-surface-2/70 px-5 py-4 text-[14.5px] leading-relaxed text-ink-secondary">
                      <p className={activeDemo.fontClass}>{activeDemo.answer}</p>

                      {/* Source Chip & Add to Calendar */}
                      <div className="mt-4 pt-3 border-t border-hairline/80 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink-muted">
                          <FileCheck2 className="h-4 w-4 text-accent" />
                          {activeDemo.source}
                        </span>

                        <a
                          href={calData.gcalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft hover:bg-accent hover:text-white px-3 py-1.5 font-semibold text-accent transition-colors"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Add to Calendar
                          <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </div>
                    </div>

                    {/* Follow-up Chips */}
                    <div className="flex flex-wrap items-center gap-2 pl-1 pt-1">
                      <span className="text-[11.5px] uppercase tracking-wider text-ink-muted flex items-center gap-1 mr-1">
                        <Tag className="h-3 w-3" /> Follow-up:
                      </span>
                      {['Fee breakdown?', 'Exam schedule?', 'Hostel rules?'].map((chip) => (
                        <span
                          key={chip}
                          className="rounded-pill border border-hairline bg-surface-2 px-3 py-1 text-[12.5px] text-ink-secondary hover:text-ink cursor-pointer transition-colors"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </div>
    </Scene>
  );
}

export default InteractiveDemo;
