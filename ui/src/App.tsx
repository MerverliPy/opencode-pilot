/**
 * Pilot UI — Root application component with routing.
 *
 * Provides routes for Chat, Sessions, Files, Terminal, Diff, and Settings.
 * Wraps everything in a responsive Layout with sidebar / bottom nav.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { InstallBanner } from "./components/InstallBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Chat } from "./pages/Chat";
import { SimpleChat } from "./pages/SimpleChat";
import { Sessions } from "./pages/Sessions";
import { Files } from "./pages/Files";
import { Terminal } from "./pages/Terminal";
import { Diff } from "./pages/Diff";
import { Settings } from "./pages/Settings";
import { Memory } from "./pages/Memory";

export function App() {
  return (
    <Layout>
      <InstallBanner />
      <ErrorBoundary>
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
      </ErrorBoundary>
    </Layout>
  );
}
