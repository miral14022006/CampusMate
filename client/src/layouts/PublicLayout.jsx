import AnimatedOutlet from '../components/AnimatedOutlet';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-page">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-sm bg-accent px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <main id="main-content">
        <AnimatedOutlet />
      </main>
    </div>
  );
}

export default PublicLayout;
