/**
 * useMemoryExtraction
 *
 * Watches session status and fires the MemoryExtractor when a busy session
 * transitions to idle. Runs silently in the background — never throws.
 */
import { useEffect, useRef } from "react";
import type { OpencodeClient } from "../../../services/api";
import type { ServerConfig } from "../../../services/auth";
import type { SessionStatus } from "../../../services/types";
import type { Turn } from "../../../store/session";
import { useMemoryStore } from "../store/memoryStore";
import { MemoryExtractor } from "../extraction/MemoryExtractor";

export function useMemoryExtraction(opts: {
  client: OpencodeClient | null;
  serverId: string | null;
  server: ServerConfig | null;
  serverUrl?: string;
  status: SessionStatus;
  turns: Turn[];
}) {
  const { client, serverId, server, serverUrl, status, turns } = opts;

  const config = useMemoryStore((s) => s.config);
  const setExtracting = useMemoryStore((s) => s.setExtracting);
  const addMemories = useMemoryStore((s) => s.addMemories);
  const refreshMemories = useMemoryStore((s) => s.refreshMemories);

  // Keep a stable reference to the extractor, recreated only when the client
  // or server changes.
  const extractorRef = useRef<MemoryExtractor | null>(null);
  useEffect(() => {
    if (!client || !serverId) {
      extractorRef.current = null;
      return;
    }
    extractorRef.current = new MemoryExtractor(client, serverId, serverUrl);
  }, [client, serverId, serverUrl]);

  // Track the previous status so we can detect busy → idle transitions.
  const prevStatusRef = useRef<SessionStatus>("idle");

  // Keep a ref to the latest turns so the effect closure always sees fresh data.
  const turnsRef = useRef(turns);
  useEffect(() => {
    turnsRef.current = turns;
  });

  // Keep a ref to the server config so the effect closure always has fresh data.
  const serverRef = useRef(server);
  useEffect(() => {
    serverRef.current = server;
  });

  useEffect(() => {
    const wasActive = prevStatusRef.current === "busy";
    prevStatusRef.current = status;

    if (!wasActive || status !== "idle") return;
    if (!config?.enabled || !config?.extractEnabled) return;
    if (!extractorRef.current) return;

    const extractor = extractorRef.current;
    const currentTurns = turnsRef.current;
    const currentServer = serverRef.current;
    if (currentTurns.length === 0) return;

    setExtracting(true);
    extractor
      .extract(currentTurns, config)
      .then((newMemories) => {
        if (newMemories.length > 0) addMemories(newMemories);
      })
      .catch(() => {
        // Silent failure — memory extraction must never interrupt the user.
      })
      .finally(() => {
        setExtracting(false);
        if (currentServer) void refreshMemories(currentServer);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
}
