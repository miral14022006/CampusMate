import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Logo from './components/brand/Logo';
import { useAdminAuth } from './context/AuthContext';
import { CommandPalette } from './components/CommandPalette';

const PublicLayout = lazy(() => import('./layouts/PublicLayout'));
const ChatLayout = lazy(() => import('./layouts/ChatLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

const Landing = lazy(() => import('./pages/Landing'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Chat = lazy(() => import('./pages/Chat'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documents = lazy(() => import('./pages/Documents'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Cache = lazy(() => import('./pages/Cache'));
const Settings = lazy(() => import('./pages/Settings'));
const DevUI = lazy(() => import('./pages/DevUI'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo variant="mark" size="lg" />
        <span className="text-[12px] font-medium tracking-wide text-ink-muted">Loading CampusMate…</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Splash />}>
      <CommandPalette />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/dev/ui" element={import.meta.env.DEV ? <DevUI /> : <Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/chat" element={<ChatLayout />}>
          <Route index element={<Chat />} />
          <Route path=":id" element={<Chat />} />
        </Route>

        {/* Support /app as an alias for /chat as requested */}
        <Route path="/app" element={<ChatLayout />}>
          <Route index element={<Chat />} />
          <Route path=":id" element={<Chat />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="documents" element={<Documents />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="cache" element={<Cache />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
