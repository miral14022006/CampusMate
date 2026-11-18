import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import Logo from '../../../components/brand/Logo';
import { Button } from '../../../components/ui/Button';
import { PROJECT_DISCLAIMER, TEAM_INFO } from '../../../config/landing';
import { footerGroups } from '../../../config/navigation';
import { useAdminAuth } from '../../../context/AuthContext';

export function Footer() {
  const { isAuthenticated } = useAdminAuth();

  return (
    <footer className="border-t border-hairline bg-[#141414] relative z-10 text-ink">
      {/* Closing CTA Strip at the top of the footer */}
      <div className="border-b border-hairline bg-[linear-gradient(180deg,rgba(212,103,63,0.06),transparent)] py-8 px-5 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1120px] 2xl:max-w-[1280px] flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-[17px] font-bold text-ink">Ready to ask your campus question?</h3>
            <p className="text-[13px] text-ink-secondary mt-0.5">
              Get grounded answers in seconds in English, Hindi, Gujarati, Hinglish or Gujlish.
            </p>
          </div>
          <Link to="/app" className="inline-flex min-h-[44px] shrink-0">
            <Button
              className="h-11 px-6 text-[13.5px]"
              rightIcon={<ArrowRight className="cm-btn-arrow h-4 w-4" aria-hidden="true" />}
            >
              Start Chatting
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1120px] 2xl:max-w-[1280px] px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand & Project Attribution */}
          <div className="max-w-md">
            <Link
              to="/"
              aria-label="CampusMate home"
              className="inline-block rounded-md outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Logo size="md" />
            </Link>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
              AI campus assistant grounded in verified notices, exams, fees and academic guidelines.
            </p>

            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-secondary">
              {PROJECT_DISCLAIMER}
            </p>

            <div className="mt-3.5 text-[11px] leading-relaxed text-ink-muted border-t border-hairline pt-2.5">
              <p className="font-semibold text-ink">{TEAM_INFO.department}</p>
              <p>{TEAM_INFO.institution}</p>
              <p>{TEAM_INFO.location}</p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-[10.5px] text-ink-muted">
              <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
              Academic Research Capstone Project
            </div>
          </div>

          {/* Dynamic Links Grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            {footerGroups.map((group) => {
              const visibleLinks = group.links.filter((l) => !l.requiresAdmin || isAuthenticated);
              if (visibleLinks.length === 0) return null;

              return (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                    {group.title}
                  </p>
                  <ul className="mt-3 space-y-2 text-[12.5px] text-ink-muted">
                    {visibleLinks.map((link) => (
                      <li key={link.id}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 hover:text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
                          >
                            {link.label} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : link.to.startsWith('/#') ? (
                          <a
                            href={link.to}
                            className="hover:text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            to={link.to}
                            className="hover:text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-10 border-t border-hairline pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted">
          <p>© {new Date().getFullYear()} CampusMate · PDEU CSE Capstone Project.</p>
          <p className="text-center sm:text-right">
            Grounding is strictly enforced against official published institutional circulars.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
