/**
 * iOS "Add to Home Screen" install banner.
 *
 * Shows a dismissible banner on iOS Safari when the app is not running
 * in standalone mode. Persists dismissal in localStorage.
 */
import { useState, useEffect } from "react";
import { colors, fonts } from "../theme";

const STORAGE_KEY = "pilot_ios_banner_dismissed";

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isIOSSafari()) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="install-banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: fonts.sans,
        fontSize: 14,
        color: colors.text,
      }}
    >
      <span>
        Install Pilot: tap <span style={{ color: colors.accent }}>Share</span>{" "}
        then <span style={{ color: colors.accent }}>Add to Home Screen</span>
      </span>
      <button
        data-testid="install-banner-dismiss"
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          color: colors.muted,
          fontSize: 18,
          cursor: "pointer",
          padding: "0 4px",
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
