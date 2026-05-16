import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock server store for hydration check
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

import { useServerStore } from "../../store/server";
import { Layout } from "../Layout";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

function renderLayout(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Layout>
        <div data-testid="page-content">Page Content</div>
      </Layout>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    mockedUseServerStore.mockImplementation(
      (selector: (state: { hydrated: boolean }) => unknown) => {
        const state = { hydrated: true };
        return selector(state);
      },
    );
  });

  it("renders children in main content area", () => {
    renderLayout();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders nav items in sidebar and mobile nav", () => {
    renderLayout();
    // Each nav item appears twice (desktop sidebar + mobile nav)
    expect(screen.getAllByText("Chat")).toHaveLength(2);
    expect(screen.getAllByText("Sessions")).toHaveLength(2);
    expect(screen.getAllByText("Files")).toHaveLength(2);
    expect(screen.getAllByText("Terminal")).toHaveLength(2);
    expect(screen.getAllByText("Diff")).toHaveLength(2);
    expect(screen.getAllByText("Settings")).toHaveLength(2);
    expect(screen.getAllByText("Memory")).toHaveLength(2);
  });

  it("toggles sidebar collapse when collapse button clicked", () => {
    renderLayout();
    const collapseBtn = screen.getByLabelText("Collapse sidebar");
    fireEvent.click(collapseBtn);
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  it("uses data-testid selectors for desktop sidebar and mobile nav", () => {
    renderLayout();
    expect(screen.getByTestId("desktop-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
  });

  it("renders Pilot branding in sidebar", () => {
    renderLayout();
    expect(screen.getByText("✈ Pilot")).toBeInTheDocument();
  });

  it("collapsed sidebar hides Pilot branding", () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    // Branding text hidden when collapsed (conditional render)
    expect(screen.queryByText("✈ Pilot")).not.toBeInTheDocument();
  });
});
