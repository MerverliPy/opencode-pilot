/**
 * Tests for TunnelSettings component.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TunnelSettings } from "../TunnelSettings";

jest.mock("../../services/tunnel", () => ({
  fetchTunnelStatus: jest.fn(),
  startTunnel: jest.fn(),
  stopTunnel: jest.fn(),
}));

jest.mock("qrcode", () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(),
  },
}));

import {
  fetchTunnelStatus,
  startTunnel,
  stopTunnel,
} from "../../services/tunnel";
import QRCode from "qrcode";

const mockedFetchTunnelStatus = fetchTunnelStatus as jest.Mock;
const mockedStartTunnel = startTunnel as jest.Mock;
const mockedStopTunnel = stopTunnel as jest.Mock;
const mockedQRCode = QRCode as unknown as { toDataURL: jest.Mock };

describe("TunnelSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders tunnel status and controls", async () => {
    mockedFetchTunnelStatus.mockResolvedValue({
      active: false,
      url: null,
      error: null,
    });

    render(<TunnelSettings />);

    await waitFor(() => {
      expect(screen.getByText("Cloudflare Tunnel")).toBeInTheDocument();
    });

    expect(screen.getByTestId("tunnel-start")).toBeInTheDocument();
    expect(screen.getByTestId("tunnel-stop")).toBeInTheDocument();
  });

  it("shows tunnel URL and QR when active", async () => {
    mockedFetchTunnelStatus.mockResolvedValue({
      active: true,
      url: "https://abc.trycloudflare.com",
      error: null,
    });
    mockedQRCode.toDataURL.mockResolvedValue("data:image/png;base64,abc");

    render(<TunnelSettings />);

    await waitFor(() => {
      expect(
        screen.getByText("https://abc.trycloudflare.com"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("tunnel-qr")).toBeInTheDocument();
    expect(screen.getByTestId("tunnel-copy")).toBeInTheDocument();
  });

  it("starts tunnel when start button clicked", async () => {
    mockedFetchTunnelStatus.mockResolvedValue({
      active: false,
      url: null,
      error: null,
    });

    render(<TunnelSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("tunnel-start")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("tunnel-start"));

    await waitFor(() => {
      expect(mockedStartTunnel).toHaveBeenCalled();
    });
  });

  it("stops tunnel when stop button clicked", async () => {
    mockedFetchTunnelStatus.mockResolvedValue({
      active: true,
      url: "https://abc.trycloudflare.com",
      error: null,
    });
    mockedQRCode.toDataURL.mockResolvedValue("data:image/png;base64,abc");

    render(<TunnelSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("tunnel-stop")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("tunnel-stop"));

    await waitFor(() => {
      expect(mockedStopTunnel).toHaveBeenCalled();
    });
  });
});
