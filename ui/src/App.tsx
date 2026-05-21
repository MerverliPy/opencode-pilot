/**
 * Pilot UI — Root application component with routing.
 *
 * Provides routes for Chat, Sessions, Files, Terminal, Diff, and Settings.
 * Wraps everything in a responsive Layout with sidebar / bottom nav.
 */
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useServerStore } from "./store/server";
import { Layout } from "./components/Layout";
import { InstallBanner } from "./components/InstallBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { colors, fonts } from "./theme";

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
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 200,
        flex: 1,
        fontFamily: fonts.mono,
        color: colors.muted,
        fontSize: 14,
      }}
    >
      loading…
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

  // No active server — redirect to settings so user can configure one
  if (!activeServer) {
    return <Navigate to="/settings" replace />;
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
              <AuthGuard>
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              </AuthGuard>
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
