import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '../../components/brand/Logo';
import { EASE } from '../../lib/motion';

export function AuthLayout({ children, variant = 'student', badge = null }) {
  const isAdmin = variant === 'admin';
  const heroImage = isAdmin ? '/images/pdeu-gate-clean.jpg' : '/images/pdeu-campus-clean.jpg';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#101010] text-ink selection:bg-accent selection:text-white flex flex-col justify-between">
      {/* Dynamic Fullscreen Anime Background with Vibrant Visibility */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.img
          src={heroImage}
          alt={isAdmin ? 'PDEU Grand Entrance' : 'PDEU Campus Architecture'}
          className="h-full w-full object-cover object-center filter brightness-[0.88] contrast-[1.08] saturate-[1.12]"
          initial={{ scale: 1.02 }}
          animate={{ scale: [1.02, 1.07, 1.02] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Soft edge darkening vignettes allowing the artwork and sunset clouds to pop brightly */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      {/* Dynamic Animated Ambient Glow Orbs */}
      <motion.div
        className="pointer-events-none fixed -left-32 top-1/4 h-[500px] w-[500px] rounded-full opacity-25 blur-[150px] z-0"
        style={{
          background: isAdmin
            ? 'radial-gradient(circle, #f59e0b, transparent 70%)'
            : 'radial-gradient(circle, var(--accent), transparent 70%)'
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="pointer-events-none fixed -right-32 bottom-10 h-[450px] w-[450px] rounded-full opacity-20 blur-[150px] z-0"
        style={{
          background: isAdmin
            ? 'radial-gradient(circle, var(--accent), transparent 70%)'
            : 'radial-gradient(circle, #ea580c, transparent 70%)'
        }}
        animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between px-5 pt-4 pb-2 sm:px-8">
        <Link
          to="/"
          aria-label="CampusMate home"
          className="inline-flex items-center gap-2 rounded-xl bg-[#141414]/85 px-4 py-2 backdrop-blur-xl border border-white/15 shadow-lg focus-visible:outline-2 focus-visible:outline-accent transition-transform hover:scale-[1.02]"
        >
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          {badge}
          <Link
            to="/"
            className="rounded-pill border border-white/15 bg-[#141414]/85 px-4 py-1.5 text-[13px] font-semibold text-zinc-200 backdrop-blur-xl transition-all hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-accent shadow-md"
          >
            Back to campus
          </Link>
        </div>
      </header>

      {/* Main Centered Content Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-3 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="w-full max-w-[500px] my-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between px-5 py-2.5 text-[12px] text-zinc-300 sm:px-8">
        <span className="rounded-md bg-[#141414]/80 px-3 py-1 backdrop-blur-xl border border-white/10 font-medium">
          © {new Date().getFullYear()} CampusMate · PDEU
        </span>
        <span className="inline-flex items-center gap-2 rounded-md bg-[#141414]/80 px-3 py-1 backdrop-blur-xl border border-white/10 text-emerald-400 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Gateway Online
        </span>
      </footer>
    </div>
  );
}

export default AuthLayout;
