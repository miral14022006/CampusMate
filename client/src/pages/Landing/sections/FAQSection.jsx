import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Mail } from 'lucide-react';
import Scene from '../components/Scene';
import { FAQ_ITEMS, CAMPUS_CONTACT } from '../../../config/landing';
import { Card } from '../../../components/ui/Card';
import { DURATION, EASE } from '../../../lib/motion';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <Scene
      id="faq"
      eyebrow="Answers & Clarifications"
      title="Frequently asked questions."
      subtitle="Everything you need to know about citations, data provenance, and multilingual capabilities."
      glowPosition="top-left"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start w-full">
        {/* Left Column (4/12): Heading & Helpdesk Link */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-hairline bg-surface-1/90 p-6 shadow-lift">
            <div className="flex items-center gap-2.5 text-accent">
              <HelpCircle className="h-5 w-5" />
              <h3 className="text-[16px] font-semibold text-ink">Have a unique query?</h3>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
              CampusMate answers questions grounded in official published circulars. If your issue involves original physical documents, fee discrepancies, or personal administrative approvals:
            </p>
            <div className="mt-5 pt-4 border-t border-hairline">
              {CAMPUS_CONTACT.helpdeskEmail ? (
                <a
                  href={`mailto:${CAMPUS_CONTACT.helpdeskEmail}`}
                  className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent hover:underline outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
                >
                  <Mail className="h-4 w-4" />
                  Still stuck? Contact the helpdesk
                </a>
              ) : (
                <p className="text-[13px] text-ink-muted">
                  Verified helpdesk contact details are not published for this deployment yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (8/12): Compact Accordion */}
        <div className="lg:col-span-8 space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Card
                key={item.q}
                padding="none"
                className="bg-surface-1/90 border-hairline overflow-hidden transition-colors hover:border-[color:var(--border-strong)] shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full min-h-[52px] items-center justify-between px-5 py-3.5 text-left text-[15px] font-medium text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{item.q}</span>
                  <m.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: DURATION.base, ease: EASE }}
                    className="shrink-0"
                  >
                    <ChevronDown
                      className={`h-4.5 w-4.5 ${isOpen ? 'text-accent' : 'text-ink-muted'}`}
                      aria-hidden="true"
                    />
                  </m.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: DURATION.base, ease: EASE }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-5 pb-4 pt-1 text-[14px] leading-relaxed text-ink-secondary border-t border-hairline/60">
                        {item.a}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      </div>
    </Scene>
  );
}

export default FAQSection;
