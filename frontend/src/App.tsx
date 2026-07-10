import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Route-based code splitting: heavy pages (and their dependencies such as the
// markdown renderer + syntax highlighter) load only when navigated to.
const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const ChatPage = lazy(() => import('@/pages/Chat'));
const AdminPage = lazy(() => import('@/pages/Admin'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));

/** Full-screen fallback shown while a lazy route chunk loads. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Root application component: defines the route table.
 *
 * Public routes: /login, /register.
 * Protected routes require a valid session; /admin additionally requires the
 * ADMIN role (enforced client-side here and server-side on the API).
 */
export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />

        {/* Fallback: redirect unknown paths to the dashboard. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
