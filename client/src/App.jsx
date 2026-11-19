import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Logo from './components/brand/Logo';
import { CommandPalette } from './components/CommandPalette';
import { ProtectedRoute, RoleGate } from './features/auth/guards';

const PublicLayout = lazy(() => import('./layouts/PublicLayout'));
const ChatLayout = lazy(() => import('./layouts/ChatLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

const Landing = lazy(() => import('./pages/Landing'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Chat = lazy(() => import('./pages/Chat'));
const Documents = lazy(() => import('./pages/Documents'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Cache = lazy(() => import('./pages/Cache'));
const Settings = lazy(() => import('./pages/Settings'));
const DevUI = lazy(() => import('./pages/DevUI'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('./features/auth/AdminLoginPage'));
const InvitePage = lazy(() => import('./features/auth/InvitePage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('./features/auth/ChangePasswordPage'));
const ProfilePage = lazy(() => import('./features/auth/ProfilePage'));
const DocumentLibrary = lazy(() => import('./features/documents/DocumentLibrary'));
const DocumentViewer = lazy(() => import('./features/documents/DocumentViewer'));

const DashboardOverview = lazy(() => import('./features/admin/dashboard/DashboardOverview'));
const DashboardStudents = lazy(() => import('./features/admin/dashboard/DashboardStudents'));
const DashboardChats = lazy(() => import('./features/admin/dashboard/DashboardChats'));
const DashboardActivity = lazy(() => import('./features/admin/dashboard/DashboardActivity'));
const DashboardTeam = lazy(() => import('./features/admin/dashboard/DashboardTeam'));
const DashboardAudit = lazy(() => import('./features/admin/dashboard/DashboardAudit'));
const AdminDatesPage = lazy(() => import('./features/admin/AdminDatesPage'));

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

        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route
          path="/admin/change-password"
          element={
            <RoleGate>
              <ChangePasswordPage forced />
            </RoleGate>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowGuest={false}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute allowGuest={false}>
              <DocumentLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute allowGuest={false}>
              <DocumentViewer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute allowGuest={false}>
              <ChatLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Chat />} />
          <Route path=":id" element={<Chat />} />
        </Route>

        <Route
          path="/app"
          element={
            <ProtectedRoute allowGuest={false}>
              <ChatLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Chat />} />
          <Route path=":id" element={<Chat />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RoleGate>
              <AdminLayout />
            </RoleGate>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="students" element={<DashboardStudents />} />
          <Route path="documents" element={<Documents />} />
          <Route path="chats" element={<DashboardChats />} />
          <Route path="activity" element={<DashboardActivity />} />
          <Route path="review" element={<Feedback />} />
          <Route path="dates" element={<AdminDatesPage />} />
          <Route
            path="team"
            element={
              <RoleGate superadminOnly>
                <DashboardTeam />
              </RoleGate>
            }
          />
          <Route
            path="audit"
            element={
              <RoleGate superadminOnly>
                <DashboardAudit />
              </RoleGate>
            }
          />
          <Route path="analytics" element={<Analytics />} />
          <Route path="feedback" element={<Navigate to="/admin/review" replace />} />
          <Route path="cache" element={<Cache />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
