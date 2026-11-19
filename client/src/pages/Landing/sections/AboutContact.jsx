
import { ArrowUpRight, Clock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import Scene from '../components/Scene';
import { Card } from '../../../components/ui/Card';
import { CAMPUS_CONTACT, PROJECT_DISCLAIMER, TEAM_INFO } from '../../../config/landing';

export function AboutContact() {
  return (
    <Scene
      id="about"
      eyebrow="Institution & Support"
      title="About the project & helpdesk."
      subtitle="Built at PDEU to deliver reliable information grounded in institutional circulars."
      glowPosition="center"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full items-stretch">
        {/* Left Card: About (#about) */}
        <Card padding="lg" className="flex h-full flex-col justify-between bg-surface-1/90 border-hairline p-6 sm:p-8 shadow-lift">
          <div>
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
                About The Project
              </span>
              <span className="rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-semibold text-accent flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> CSE Capstone
              </span>
            </div>

            <h3 className="mt-4 text-[21px] font-bold text-ink">
              Designed for PDEU, grounded in truth.
            </h3>

            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
              CampusMate was built in the {TEAM_INFO.department} at {TEAM_INFO.institution}. It brings together multilingual transformer models, hybrid neural retrieval (BM25 + FAISS), and rigorous citation verification.
            </p>

            <p className="mt-4 rounded-xl border border-hairline bg-surface-2 p-3.5 text-[13px] font-medium text-ink-secondary">
              {PROJECT_DISCLAIMER}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline/60 pt-4 text-center">
            <div>
              <p className="text-[18px] font-bold text-accent">5</p>
              <p className="text-[11px] uppercase text-ink-muted mt-0.5">Languages</p>
            </div>
            <div>
              <p className="text-[18px] font-bold text-accent">BM25+Dense</p>
              <p className="text-[11px] uppercase text-ink-muted mt-0.5">Hybrid Search</p>
            </div>
            <div>
              <p className="text-[18px] font-bold text-accent">Page-Level</p>
              <p className="text-[11px] uppercase text-ink-muted mt-0.5">Citations</p>
            </div>
          </div>
        </Card>

        {/* Right Card: Contact (#contact anchor inside) */}
        <Card id="contact" padding="lg" className="flex h-full flex-col justify-between bg-surface-1/90 border-hairline p-6 sm:p-8 shadow-lift scroll-mt-24">
          <div>
            <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
                Human Helpdesk
              </span>
              <span className="text-[12px] text-ink-muted">Official Contacts</span>
            </div>

            <h3 className="mt-4 text-[21px] font-bold text-ink">
              Need direct university assistance?
            </h3>

            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">
              For admissions paperwork, physical fee receipts, or inquiries beyond published circulars, contact the campus administrative offices.
            </p>

            <ul className="mt-5 space-y-3.5">
              {[
                CAMPUS_CONTACT.helpdeskEmail && {
                  icon: Mail,
                  label: CAMPUS_CONTACT.helpdeskEmail,
                  href: `mailto:${CAMPUS_CONTACT.helpdeskEmail}`
                },
                CAMPUS_CONTACT.phone && {
                  icon: Phone,
                  label: CAMPUS_CONTACT.phone,
                  href: `tel:${CAMPUS_CONTACT.phoneTel}`
                },
                CAMPUS_CONTACT.addressShort && {
                  icon: MapPin,
                  label: CAMPUS_CONTACT.addressShort,
                  href: null
                },
                CAMPUS_CONTACT.hours && { icon: Clock, label: CAMPUS_CONTACT.hours, href: null }
              ]
                .filter(Boolean)
                .map(({ icon: Icon, label, href }) => (
                  <li key={label} className="flex items-center gap-3 text-[14px] text-ink-secondary">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon className="h-4 w-4" />
                    </span>
                    {href ? (
                      <a
                        href={href}
                        className="hover:text-ink hover:underline outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
                      >
                        {label}
                      </a>
                    ) : (
                      <span>{label}</span>
                    )}
                  </li>
                ))}
            </ul>
            {!CAMPUS_CONTACT.helpdeskEmail && !CAMPUS_CONTACT.phone && !CAMPUS_CONTACT.addressShort && !CAMPUS_CONTACT.hours && (
              <p className="mt-5 text-[13.5px] leading-relaxed text-ink-muted">
                Verified helpdesk contact details have not been published for this deployment yet.
              </p>
            )}
          </div>

          {CAMPUS_CONTACT.helpdeskEmail && (
            <div className="mt-6 pt-4 border-t border-hairline/60">
              <a
                href={`mailto:${CAMPUS_CONTACT.helpdeskEmail}`}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent hover:underline outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                Email campus helpdesk directly
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </Card>
      </div>
    </Scene>
  );
}

export default AboutContact;
