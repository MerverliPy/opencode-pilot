/**
 * Pilot UI — Root application component with routing.
 *
 * Provides routes for Chat, Sessions, Files, Terminal, Diff, and Settings.
 * Wraps everything in a responsive Layout with sidebar / bottom nav.
 */
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

export function App() {
  return (
    <Layout>
      <InstallBanner />
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <SimpleChat />
              </ErrorBoundary>
            }
          />
          <Route
            path="/chat"
            element={
              <ErrorBoundary>
                <SimpleChat />
              </ErrorBoundary>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <ErrorBoundary>
                <Chat />
              </ErrorBoundary>
            }
          />
          <Route
            path="/sessions"
            element={
              <ErrorBoundary>
                <Sessions />
              </ErrorBoundary>
            }
          />
          <Route
            path="/files"
            element={
              <ErrorBoundary>
                <Files />
              </ErrorBoundary>
            }
          />
          <Route
            path="/terminal"
            element={
              <ErrorBoundary>
                <Terminal />
              </ErrorBoundary>
            }
          />
          <Route
            path="/diff"
            element={
              <ErrorBoundary>
                <Diff />
              </ErrorBoundary>
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
              <ErrorBoundary>
                <Memory />
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
