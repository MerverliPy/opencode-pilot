/**
 * Terminal page — xterm.js with node-pty WebSocket bridge.
 *
 * Supports multiple terminal tabs, each backed by an independent PTY session.
 * Tabs are kept alive (display: none) between switches to preserve scroll buffer.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useServerStore } from "../store/server";
import { colors, fonts, fontSizes, getResolvedColors } from "../theme";

interface TermTab {
  id: string;
  sessionId: string | null;
  label: string;
  term: XTerm;
  fitAddon: FitAddon;
  ws: WebSocket | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function buildWsUrl(serverUrl: string, sessionId?: string): string {
  // Use relative path so it works in both dev (via Vite proxy) and production
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  const base = `${proto}//${host}/terminal/ws`;
  return sessionId ? `${base}?id=${sessionId}` : base;
}

function terminalTheme() {
  const palette = getResolvedColors();
  return {
    background: palette.bg,
    foreground: palette.text,
    cursor: palette.accent,
    selectionBackground: palette.selectionBackground,
  };
}

function createTab(id: string, label: string): Omit<TermTab, "containerRef"> {
  const term = new XTerm({
    fontFamily: fonts.mono,
    fontSize: 13,
    theme: terminalTheme(),
    cursorBlink: true,
    scrollback: 5000,
    convertEol: true,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  return { id, sessionId: null, label, term, fitAddon, ws: null };
}

let tabCounter = 0;
function nextTabId(): string {
  return `tab-${++tabCounter}`;
}

export function Terminal() {
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const server = useMemo(
    () => servers.find((s) => s.id === activeId) ?? null,
    [servers, activeId]
  );

  // Maintain tabs as a ref to avoid stale closures in effects
  const tabsRef = useRef<TermTab[]>([]);
  const openedTabsRef = useRef<Set<string>>(new Set());
  const [tabs, setTabs] = useState<Array<{ id: string; label: string }>>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  const containerRefs = useRef<
    Map<string, React.RefObject<HTMLDivElement | null>>
  >(new Map());

  /** Open a WebSocket connection for a tab. */
  const connectTab = useCallback(
    (tab: TermTab) => {
      const serverUrl = server?.url ?? window.location.origin;
      const ws = new WebSocket(buildWsUrl(serverUrl));

      ws.onopen = () => {
        tab.ws = ws;
        tab.term.write(`\r\n\x1b[32m[terminal connected]\x1b[0m\r\n`);
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as {
            type: string;
            id?: string;
            code?: number;
          };
          if (parsed.type === "session") {
            tab.sessionId = parsed.id ?? null;
          } else if (parsed.type === "exit") {
            tab.term.write(
              `\r\n\x1b[31m[process exited with code ${parsed.code ?? 0}]\x1b[0m\r\n`,
            );
          } else if (parsed.type === "error") {
            tab.term.write(`\r\n\x1b[31m[error: ${event.data}]\x1b[0m\r\n`);
          }
        } catch {
          // Raw pty output
          tab.term.write(event.data);
        }
      };

      ws.onerror = () => {
        tab.term.write(`\r\n\x1b[31m[connection error]\x1b[0m\r\n`);
      };

      ws.onclose = () => {
        tab.ws = null;
        tab.term.write(`\r\n\x1b[33m[disconnected]\x1b[0m\r\n`);
      };

      tab.term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      tab.ws = ws;
    },
    [server?.url],
  );

  /** Add a new terminal tab. */
  const addTab = useCallback(() => {
    const id = nextTabId();
    const ref: React.RefObject<HTMLDivElement | null> = { current: null };
    const tabData = createTab(id, `bash ${tabCounter}`);
    const tab: TermTab = { ...tabData, containerRef: ref };

    containerRefs.current.set(id, ref);
    // C15: Dispose any stale xterm at same tab position before creating new one
    for (const existing of tabsRef.current) {
      if (existing.id === id) {
        existing.ws?.close();
        existing.term.dispose();
      }
    }
    tabsRef.current = tabsRef.current.filter((t) => t.id !== id);
    tabsRef.current.push(tab);
    setTabs((prev) => [...prev, { id, label: tab.label }]);
    setActiveTabId(id);
  }, [connectTab]);

  /** Close a terminal tab. */
  const closeTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (tab) {
      if (tab.ws) {
        tab.ws.send(JSON.stringify({ type: "kill" }));
        tab.ws.close();
      }
      tab.term.dispose();
    }
    tabsRef.current = tabsRef.current.filter((t) => t.id !== tabId);
    containerRefs.current.delete(tabId);

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id);
      } else {
        setActiveTabId("");
      }
      return remaining;
    });
  }, []);

  // C14: Connect tabs via useEffect instead of setTimeout (avoids DOM race)
  useEffect(() => {
    for (const tab of tabsRef.current) {
      if (openedTabsRef.current.has(tab.id)) continue;
      const container = tab.containerRef.current;
      if (!container || container.hasChildNodes()) continue;

      tab.term.open(container);
      tab.fitAddon.fit();
      connectTab(tab);
      openedTabsRef.current.add(tab.id);

      // Send initial resize after connection
      if (tab.ws && tab.ws.readyState === WebSocket.OPEN) {
        const { cols, rows } = tab.term;
        tab.ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    }
  });

  // Fit active terminal on resize
  useEffect(() => {
    const handleResize = () => {
      const tab = tabsRef.current.find((t) => t.id === activeTabId);
      if (!tab) return;
      tab.fitAddon.fit();
      if (tab.ws && tab.ws.readyState === WebSocket.OPEN) {
        const { cols, rows } = tab.term;
        tab.ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTabId]);

  // Fit on tab switch
  useEffect(() => {
    if (!activeTabId) return;
    const tab = tabsRef.current.find((t) => t.id === activeTabId);
    if (tab) {
      setTimeout(() => tab.fitAddon.fit(), 10);
    }
  }, [activeTabId]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleThemeChange = () => {
      const theme = terminalTheme();
      for (const tab of tabsRef.current) {
        tab.term.options.theme = theme;
      }
    };

    media.addEventListener("change", handleThemeChange);
    return () => media.removeEventListener("change", handleThemeChange);
  }, []);

  // Open first tab on mount
  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
    // Cleanup on unmount
    return () => {
      for (const tab of tabsRef.current) {
        tab.ws?.close();
        tab.term.dispose();
      }
      tabsRef.current = [];
      openedTabsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!server) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: fontSizes.md,
        }}
      >
        no server configured — go to settings
      </div>
    );
  }

  return (
    <div
      data-testid="terminal-container"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        backgroundColor: colors.bg,
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        data-testid="terminal-tab-bar"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          padding: "0 8px",
          gap: 4,
          minHeight: 36,
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 4,
              backgroundColor:
                tab.id === activeTabId ? colors.surfaceAlt : "transparent",
              color: tab.id === activeTabId ? colors.text : colors.muted,
              cursor: "pointer",
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              userSelect: "none",
              flexShrink: 0,
            }}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "0 2px",
                fontSize: 12,
                lineHeight: 1,
                opacity: 0.7,
              }}
              aria-label={`Close ${tab.label}`}
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addTab}
          style={{
            background: "none",
            border: `1px solid ${colors.border}`,
            color: colors.muted,
            cursor: "pointer",
            borderRadius: 4,
            padding: "2px 8px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            marginLeft: 4,
            flexShrink: 0,
          }}
          aria-label="New terminal tab"
        >
          + New
        </button>
      </div>

      {/* Terminal containers — all rendered, only active is visible */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={(el) => {
              const r = containerRefs.current.get(tab.id);
              if (r) r.current = el;
            }}
            style={{
              position: "absolute",
              inset: 0,
              padding: 8,
              display: tab.id === activeTabId ? "block" : "none",
            }}
          />
        ))}

        {tabs.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: colors.muted,
              fontFamily: fonts.sans,
              fontSize: fontSizes.sm,
            }}
          >
            click &quot;+ New&quot; to open a terminal
          </div>
        )}
      </div>
    </div>
  );
}
