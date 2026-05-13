/**
 * Tests for PushSettings component.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PushSettings } from "../PushSettings";

jest.mock("../../services/push", () => ({
  fetchPushStatus: jest.fn(),
  subscribeToPush: jest.fn(),
  unsubscribeFromPush: jest.fn(),
  isPushSubscribed: jest.fn(),
}));

import {
  fetchPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "../../services/push";

const mockedFetchPushStatus = fetchPushStatus as jest.Mock;
const mockedSubscribeToPush = subscribeToPush as jest.Mock;
const mockedUnsubscribeFromPush = unsubscribeFromPush as jest.Mock;
const mockedIsPushSubscribed = isPushSubscribed as jest.Mock;

describe("PushSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows push status and enable button when not subscribed", async () => {
    mockedFetchPushStatus.mockResolvedValue({
      enabled: true,
      publicKey: "test-key",
    });
    mockedIsPushSubscribed.mockResolvedValue(false);

    render(<PushSettings />);

    await waitFor(() => {
      expect(screen.getByText("Not subscribed")).toBeInTheDocument();
    });

    expect(screen.getByTestId("push-toggle")).toHaveTextContent("Enable");
  });

  it("subscribes when enable is clicked", async () => {
    mockedFetchPushStatus.mockResolvedValue({
      enabled: true,
      publicKey: "test-key",
    });
    mockedIsPushSubscribed.mockResolvedValue(false);
    mockedSubscribeToPush.mockResolvedValue(true);

    render(<PushSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("push-toggle")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("push-toggle"));

    await waitFor(() => {
      expect(mockedSubscribeToPush).toHaveBeenCalledWith("test-key");
    });
  });

  it("unsubscribes when disable is clicked", async () => {
    mockedFetchPushStatus.mockResolvedValue({
      enabled: true,
      publicKey: "test-key",
    });
    mockedIsPushSubscribed.mockResolvedValue(true);
    mockedUnsubscribeFromPush.mockResolvedValue(true);

    render(<PushSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("push-toggle")).toHaveTextContent("Disable");
    });

    fireEvent.click(screen.getByTestId("push-toggle"));

    await waitFor(() => {
      expect(mockedUnsubscribeFromPush).toHaveBeenCalled();
    });
  });

  it("shows not configured when push is disabled on server", async () => {
    mockedFetchPushStatus.mockResolvedValue({
      enabled: false,
      publicKey: null,
    });
    mockedIsPushSubscribed.mockResolvedValue(false);

    render(<PushSettings />);

    await waitFor(() => {
      expect(screen.getByText("Not configured")).toBeInTheDocument();
    });

    expect(screen.getByTestId("push-toggle")).toBeDisabled();
  });
});
