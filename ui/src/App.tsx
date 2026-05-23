import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useServerStore } from "./store/server";
import { Layout } from "./components/Layout";
import { InstallBanner } from "./components/InstallBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Chat = lazy(() => import("./pages/Chat").then((m) => ({ default: m.Chat })));
const SimpleChat = lazy(() => import("./pages/SimpleChat").then((m) => ({ default: m.SimpleChat })));
const Sessions = lazy(() => import("./pages/Sessions").then((m) => ({ default: m.Sessions })));
const Files = lazy(() => import("./pages/Files").then((m) => ({ default: m.Files })));
const Terminal = lazy(() => import("./pages/Terminal").then((m) => ({ default: m.Terminal })));
const Diff = lazy(() => import("./pages/Diff").then((m) => ({ default: m.Diff })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const Memory = lazy(() => import("./pages/Memory").then((m) => ({ default: m.Memory })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
function LoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        height: "100%",
        minHeight: 200,
        flex: 1,
      }}
    >
      <div className="skeleton-pulse" style={{ width: "40%", height: 24, borderRadius: 4, backgroundColor: "var(--pilot-surface-alt)", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
      <div className="skeleton-pulse" style={{ width: "100%", height: 12, borderRadius: 4, backgroundColor: "var(--pilot-surface-alt)", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
      <div className="skeleton-pulse" style={{ width: "80%", height: 12, borderRadius: 4, backgroundColor: "var(--pilot-surface-alt)", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
      <div className="skeleton-pulse" style={{ width: "60%", height: 12, borderRadius: 4, backgroundColor: "var(--pilot-surface-alt)", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
      <div style={{ marginTop: 24 }}>
        <div className="skeleton-pulse" style={{ width: "100%", height: 200, borderRadius: 8, backgroundColor: "var(--pilot-surface-alt)", animation: "skeleton-pulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

/**
 * AuthGuard checks the session cookie with the server on mount and
 * redirects if the user is not authenticated or no server is active.
 */
function AuthGuard({ children }: { children: ReactNode }) {
  const hydrated = useServerStore((s) => s.hydrated);
  const authenticated = useServerStore((s) => s.authenticated);
  const activeServer = useServerStore((s) => {
    const { servers, activeId } = s;
    return servers.find((srv) => srv.id === activeId) ?? null;
  });
  const checkAuth = useServerStore((s) => s.checkAuth);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (hydrated && activeServer) {
      checkAuth().finally(() => setChecking(false));
    } else if (hydrated) {
      setChecking(false);
    }
  }, [hydrated, activeServer, checkAuth]);

  if (!hydrated || checking) {
    return <LoadingFallback />;
  }

  // No active server: allow route components to render their own
  // no-server/configuration states. Settings must stay reachable so users and
  // tests can configure a server.
  if (!activeServer) {
    return <>{children}</>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Layout>
      <InstallBanner />
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <ErrorBoundary>
                <Login />
              </ErrorBoundary>
            }
          />
          <Route
            path="/"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <SimpleChat />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/chat"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <SimpleChat />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Chat />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/sessions"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Sessions />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/files"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Files />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/terminal"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Terminal />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/diff"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Diff />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            }
          />
          <Route
            path="/memory"
            element={
              <AuthGuard>
                <ErrorBoundary>
                  <Memory />
                </ErrorBoundary>
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
