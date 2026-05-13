/**
 * Pilot UI — Root application component with routing.
 *
 * Provides routes for Chat, Sessions, Files, Terminal, Diff, and Settings.
 * Wraps everything in a responsive Layout with sidebar / bottom nav.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { InstallBanner } from "./components/InstallBanner";
import { Chat } from "./pages/Chat";
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
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/files" element={<Files />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/diff" element={<Diff />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
