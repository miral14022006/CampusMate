import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-page">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden="true"
      />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          to="/"
          aria-label="CampusMate home"
          className="rounded-md outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Logo size="md" />
        </Link>
        <Link
          to="/chat"
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline bg-surface-2 px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-3 outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Open chat
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
        <div className="text-center">
          <p className="text-[88px] font-bold leading-none tracking-[-0.06em] text-accent sm:text-[128px]">404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            This page took a different elective.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-ink-secondary">
            The page you are looking for does not exist or has been moved. Let&apos;s get you back to campus.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex h-11 items-center gap-2 rounded-pill bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] px-5 text-sm font-semibold text-white shadow-[0_10px_28px_-14px_rgba(212,103,63,.8)] transition-all hover:brightness-105"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <Link
              to="/chat"
              className="inline-flex h-11 items-center rounded-pill px-5 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Ask CampusMate
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
