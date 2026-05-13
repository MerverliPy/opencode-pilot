/**
 * Tests for the iOS InstallBanner component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstallBanner } from "../InstallBanner";

const STORAGE_KEY = "pilot_ios_banner_dismissed";

describe("InstallBanner", () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    localStorage.clear();
    // Reset display-mode media query to non-standalone
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  }

  it("renders on iOS Safari", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    );
    render(<InstallBanner />);
    expect(screen.getByTestId("install-banner")).toBeInTheDocument();
  });

  it("does not render on Android Chrome", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    render(<InstallBanner />);
    expect(screen.queryByTestId("install-banner")).not.toBeInTheDocument();
  });

  it("does not render when already dismissed", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    );
    render(<InstallBanner />);
    expect(screen.queryByTestId("install-banner")).not.toBeInTheDocument();
  });

  it("does not render in standalone mode", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
      })),
    });
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    );
    render(<InstallBanner />);
    expect(screen.queryByTestId("install-banner")).not.toBeInTheDocument();
  });

  it("dismisses when close button clicked", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    );
    render(<InstallBanner />);
    fireEvent.click(screen.getByTestId("install-banner-dismiss"));
    expect(screen.queryByTestId("install-banner")).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });
});
