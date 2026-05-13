/**
 * Pilot UI — Root application component with routing.
 *
 * Provides routes for Chat, Sessions, Files, and Settings.
 * Wraps everything in a responsive Layout with sidebar / bottom nav.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Chat } from "./pages/Chat";
import { Sessions } from "./pages/Sessions";
import { Files } from "./pages/Files";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:sessionId" element={<Chat />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/files" element={<Files />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
