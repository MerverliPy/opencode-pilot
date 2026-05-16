import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock server store
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

// Mock child components
jest.mock("../../components/PushSettings", () => ({
  PushSettings: () => <div data-testid="push-settings">Push Settings</div>,
}));

jest.mock("../../components/TunnelSettings", () => ({
  TunnelSettings: () => <div data-testid="tunnel-settings">Tunnel Settings</div>,
}));

jest.mock("../../services/logger", () => ({
  downloadDebugLog: jest.fn(),
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { useServerStore } from "../../store/server";
import { Settings } from "../Settings";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

const mockServer = (id: string, name: string, url: string) => ({
  id, name, url, username: "", password: "",
});

type StoreApi = {
  servers: ReturnType<typeof mockServer>[];
  activeId: string | null;
  hydrated: boolean;
  hydrate: jest.Mock;
  upsert: jest.Mock;
  remove: jest.Mock;
  setActive: jest.Mock;
};

function createStoreState(overrides?: Partial<StoreApi>): StoreApi {
  return {
    servers: [],
    activeId: null,
    hydrated: true,
    hydrate: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    setActive: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setupStore(overrides?: Partial<StoreApi>) {
  const state = createStoreState(overrides);
  mockedUseServerStore.mockImplementation(
    (selector: (state: StoreApi) => unknown) => selector(state),
  );
  return state;
}

describe("Settings", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders Settings heading", () => {
    setupStore();
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows no servers configured when empty", () => {
    setupStore();
    render(<Settings />);
    expect(screen.getByText("no servers configured")).toBeInTheDocument();
  });

  it("renders server list", () => {
    const store = setupStore({
      servers: [mockServer("s1", "Home", "http://localhost:4096")],
    });
    render(<Settings />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:4096")).toBeInTheDocument();
  });

  it("shows add server form when + Add Server clicked", () => {
    setupStore();
    render(<Settings />);
    fireEvent.click(screen.getByTestId("add-server-button"));
    expect(screen.getByText("Add Server")).toBeInTheDocument();
    expect(screen.getByTestId("server-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("server-url-input")).toBeInTheDocument();
  });

  it("shows edit server form when edit clicked", () => {
    const store = setupStore({
      servers: [mockServer("s1", "Home", "http://localhost:4096")],
    });
    render(<Settings />);
    fireEvent.click(screen.getByText("edit"));
    expect(screen.getByText("Edit Server")).toBeInTheDocument();
    expect(screen.getByTestId("server-name-input")).toHaveValue("Home");
    expect(screen.getByTestId("server-url-input")).toHaveValue(
      "http://localhost:4096",
    );
  });

  it("disables save when name is empty", () => {
    setupStore();
    render(<Settings />);
    fireEvent.click(screen.getByTestId("add-server-button"));
    const saveBtn = screen.getByText("save");
    expect(saveBtn).toBeDisabled();
  });

  it("enables save when name and url are filled", () => {
    setupStore();
    render(<Settings />);
    fireEvent.click(screen.getByTestId("add-server-button"));

    fireEvent.change(screen.getByTestId("server-name-input"), {
      target: { value: "My Server" },
    });
    fireEvent.change(screen.getByTestId("server-url-input"), {
      target: { value: "http://example.com" },
    });

    const saveBtn = screen.getByText("save");
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls upsert and closes form on save", async () => {
    const store = setupStore();
    render(<Settings />);

    fireEvent.click(screen.getByTestId("add-server-button"));
    fireEvent.change(screen.getByTestId("server-name-input"), {
      target: { value: "My Server" },
    });
    fireEvent.change(screen.getByTestId("server-url-input"), {
      target: { value: "http://example.com" },
    });

    fireEvent.click(screen.getByText("save"));

    await waitFor(() => {
      expect(store.upsert).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText("Add Server")).not.toBeInTheDocument();
    });
  });

  it("closes form on cancel", () => {
    setupStore();
    render(<Settings />);
    fireEvent.click(screen.getByTestId("add-server-button"));
    expect(screen.getByText("Add Server")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cancel"));
    expect(screen.queryByText("Add Server")).not.toBeInTheDocument();
  });

  it("calls remove when remove clicked", () => {
    const store = setupStore({
      servers: [mockServer("s1", "Home", "http://localhost:4096")],
    });
    render(<Settings />);
    fireEvent.click(screen.getByText("remove"));
    expect(store.remove).toHaveBeenCalledWith("s1");
  });

  it("calls setActive when activate clicked", () => {
    const store = setupStore({
      servers: [
        mockServer("s1", "Home", "http://localhost:4096"),
        mockServer("s2", "Remote", "http://remote:4096"),
      ],
      activeId: "s1",
    });
    render(<Settings />);
    const activateBtns = screen.getAllByText("activate");
    fireEvent.click(activateBtns[0]);
    expect(store.setActive).toHaveBeenCalledWith("s2");
  });

  it("renders PushSettings and TunnelSettings components", () => {
    setupStore();
    render(<Settings />);
    expect(screen.getByTestId("push-settings")).toBeInTheDocument();
    expect(screen.getByTestId("tunnel-settings")).toBeInTheDocument();
  });

  it("renders Download Debug Log button", () => {
    setupStore();
    render(<Settings />);
    expect(screen.getByText("Download Debug Log")).toBeInTheDocument();
  });
});
