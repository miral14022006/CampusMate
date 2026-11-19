import { useState, useRef } from 'react';
import { m, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  CheckCircle2,
  Cpu,
  FileCheck,
  Languages,
  Search,
  Sparkles
} from 'lucide-react';
import Scene from '../components/Scene';
import { ARCHITECTURE_STAGES } from '../../../config/landing';
import { Card } from '../../../components/ui/Card';
import { DURATION, EASE } from '../../../lib/motion';

const SIMPLE_STEPS = [
  {
    num: '01',
    title: 'Ask in your language',
    desc: 'Type naturally in English, Hindi, Gujarati, Hinglish or Gujlish. No rigid keywords or complex portal forms.',
    icon: Languages
  },
  {
    num: '02',
    title: 'We search official circulars',
    desc: 'Language detection, transliteration, intent classification and hybrid retrieval locate the exact paragraph.',
    icon: Search
  },
  {
    num: '03',
    title: 'Get a cited answer',
    desc: 'Receive an answer strictly verified against original text, with official notice and page numbers linked.',
    icon: FileCheck
  }
];

export function HowItWorks() {
  const [viewMode, setViewMode] = useState('simple');
  const lineContainerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: lineContainerRef,
    offset: ['start 85%', 'end 50%']
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const SwitchButton = (
    <div className="inline-flex rounded-pill border border-hairline bg-surface-2 p-1.5 shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('simple')}
        className={`relative rounded-pill px-5 py-2 text-[14px] font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${
          viewMode === 'simple' ? 'text-white' : 'text-ink-secondary hover:text-ink'
        }`}
      >
        {viewMode === 'simple' && (
          <m.div
            layoutId="how-switch-pill"
            className="absolute inset-0 rounded-pill bg-accent shadow-soft"
            transition={{ duration: DURATION.base, ease: EASE }}
          />
        )}
        <span className="relative z-10">Simple</span>
      </button>

      <button
        type="button"
        onClick={() => setViewMode('technical')}
        className={`relative rounded-pill px-5 py-2 text-[14px] font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${
          viewMode === 'technical' ? 'text-white' : 'text-ink-secondary hover:text-ink'
        }`}
      >
        {viewMode === 'technical' && (
          <m.div
            layoutId="how-switch-pill"
            className="absolute inset-0 rounded-pill bg-accent shadow-soft"
            transition={{ duration: DURATION.base, ease: EASE }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Technical
        </span>
      </button>
    </div>
  );

  return (
    <Scene
      id="how"
      eyebrow="How It Works"
      title="From question to verified citation."
      subtitle="Designed to bridge the gap between student questions and complex university circulars."
      headerRight={SwitchButton}
      glowPosition="top-left"
    >
      <div ref={lineContainerRef} className="w-full">
        <AnimatePresence mode="wait">
          {viewMode === 'simple' ? (
            <m.div
              key="simple"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="w-full"
            >
              {/* 3 Steps connected flow */}
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-4">
                <div
                  className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-[2px] md:block overflow-visible"
                  aria-hidden="true"
                >
                  <svg className="w-full h-1 overflow-visible">
                    <line
                      x1="0%"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="var(--border-strong)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <m.line
                      x1="0%"
                      y1="50%"
                      x2="100%"
                      y2="50%"
                      stroke="var(--accent)"
                      strokeWidth="2.5"
                      style={{ pathLength }}
                    />
                  </svg>
                </div>

                {SIMPLE_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <m.div
                      key={step.num}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, ease: EASE, delay: idx * 0.12 }}
                      whileHover={{ y: -6, transition: { duration: 0.2, ease: EASE } }}
                      className="h-full"
                    >
                      <Card
                        padding="lg"
                        className="relative bg-surface-1/90 border-hairline p-6 sm:p-7 text-center md:text-left flex flex-col justify-between shadow-lift h-full"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent border border-accent/20">
                              <Icon className="h-6 w-6" />
                            </span>
                            <span className="font-mono text-[13px] font-bold text-accent">
                              STEP {step.num}
                            </span>
                          </div>
                          <h3 className="mt-5 text-[18px] font-bold text-ink">{step.title}</h3>
                          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-secondary">
                            {step.desc}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-hairline/60 flex items-center gap-2 text-[12.5px] font-medium text-ink-muted">
                          <CheckCircle2 className="h-4 w-4 text-accent" /> Grounded execution
                        </div>
                      </Card>
                    </m.div>
                  );
                })}
              </div>
            </m.div>
          ) : (
            <m.div
              key="technical"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="w-full"
            >
              {/* 6-Stage Connected Pipeline - Staggered scroll animation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 pt-2">
                {ARCHITECTURE_STAGES.map((stg, idx) => (
                  <m.div
                    key={stg.step}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, ease: EASE, delay: idx * 0.08 }}
                    whileHover={{ y: -5, transition: { duration: 0.2, ease: EASE } }}
                    className="h-full"
                  >
                    <Card
                      padding="md"
                      className="bg-surface-1/95 border-hairline p-5 sm:p-6 flex flex-col justify-between hover:border-[color:var(--border-strong)] transition-all h-full shadow-soft"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
                          <span className="font-mono text-[12px] font-bold text-accent">
                            STAGE {stg.step}
                          </span>
                          <span className="rounded-pill bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-ink-muted">
                            {stg.tech}
                          </span>
                        </div>

                        <h4 className="mt-3.5 text-[16px] font-semibold text-ink">
                          {stg.name}
                        </h4>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                          {stg.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-hairline/40 flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted">
                        <Sparkles className="h-3.5 w-3.5 text-accent" /> Multilingual RAG Pipeline
                      </div>
                    </Card>
                  </m.div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Scene>
  );
}

export default HowItWorks;
