/**
 * Responsive layout with sidebar (desktop) and bottom navigation (mobile).
 *
 * Desktop (≥768px): persistent 240px sidebar on the left.
 * Mobile (<768px): full-width content + 56px bottom tab bar.
 */
import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { colors, fonts } from "../theme";
import { useServerStore } from "../store/server";
import { ConnectivityIndicator } from "./ConnectivityIndicator";

const NAV_ITEMS = [
  { path: "/chat", label: "Chat", icon: "💬" },
  { path: "/sessions", label: "Sessions", icon: "☰" },
  { path: "/files", label: "Files", icon: "📁" },
  { path: "/terminal", label: "Terminal", icon: ">_" },
  { path: "/diff", label: "Diff", icon: "±" },
  { path: "/settings", label: "Settings", icon: "⚙" },
  { path: "/memory", label: "Memory", icon: "🧠" },
];

function NavLink({
  path,
  label,
  icon,
  active,
}: {
  path: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      to={path}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderRadius: 6,
        textDecoration: "none",
        color: active ? colors.accent : colors.text,
        backgroundColor: active ? "rgba(79,195,247,0.1)" : "transparent",
        fontFamily: fonts.sans,
        fontSize: 14,
        transition: "background-color 0.15s",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = colors.surfaceAlt;
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({
  path,
  label,
  icon,
  active,
}: {
  path: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      to={path}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 56,
        textDecoration: "none",
        color: active ? colors.accent : colors.muted,
        fontFamily: fonts.sans,
        fontSize: 11,
        gap: 4,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hydrated = useServerStore((s) => s.hydrated);
  const hydrate = useServerStore((s) => s.hydrate);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/chat") {
        return (
          location.pathname === "/chat" || location.pathname === "/"
        );
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  const sidebarWidth = sidebarCollapsed ? 56 : 240;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: colors.bg,
        color: colors.text,
        overflow: "hidden",
      }}
    >
      {/* Desktop sidebar */}
      <aside
        data-testid="desktop-sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          width: sidebarWidth,
          minWidth: sidebarWidth,
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          padding: "16px 12px",
          transition: "width 0.2s",
        }}
        className="desktop-sidebar"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            padding: "0 4px",
          }}
        >
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            style={{
              background: "none",
              border: "none",
              color: colors.text,
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? "≡" : "≡"}
          </button>
          {!sidebarCollapsed && (
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 16,
                fontWeight: 600,
                color: colors.text,
              }}
            >
              ✈ Pilot
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              path={item.path}
              label={sidebarCollapsed ? "" : item.label}
              icon={item.icon}
              active={isActive(item.path)}
            />
          ))}
        </nav>
        <ConnectivityIndicator />
      </aside>

      {/* Main content area */}
      <main
        data-testid="main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          {children}
        </div>

        {/* Mobile bottom nav */}
        <nav
          data-testid="mobile-nav"
          className="mobile-nav"
          style={{
            display: "none",
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <MobileNavLink
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
              active={isActive(item.path)}
            />
          ))}
        </nav>
      </main>

      <style>{`
        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
}
