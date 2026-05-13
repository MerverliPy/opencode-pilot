/**
 * Tests for PermissionCard component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PermissionCard } from "../PermissionCard";
import type { PermissionRequest } from "@pilot-shared/types";

function makePermission(
  overrides: Partial<PermissionRequest> = {},
): PermissionRequest {
  return {
    id: "perm-1",
    sessionID: "s1",
    type: "tool",
    title: "Allow write_file?",
    ...overrides,
  };
}

describe("PermissionCard", () => {
  it("renders permission title", () => {
    render(
      <PermissionCard permission={makePermission()} onRespond={jest.fn()} />,
    );
    expect(screen.getByText("Allow write_file?")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <PermissionCard
        permission={makePermission({ description: "Writes to src/lib.ts" })}
        onRespond={jest.fn()}
      />,
    );
    expect(screen.getByText("Writes to src/lib.ts")).toBeInTheDocument();
  });

  it("calls onRespond with 'always' when Always clicked", () => {
    const onRespond = jest.fn();
    render(
      <PermissionCard permission={makePermission()} onRespond={onRespond} />,
    );
    fireEvent.click(screen.getByText("Always"));
    expect(onRespond).toHaveBeenCalledWith("always");
  });

  it("calls onRespond with 'once' when Once clicked", () => {
    const onRespond = jest.fn();
    render(
      <PermissionCard permission={makePermission()} onRespond={onRespond} />,
    );
    fireEvent.click(screen.getByText("Once"));
    expect(onRespond).toHaveBeenCalledWith("once");
  });

  it("calls onRespond with 'reject' when Reject clicked", () => {
    const onRespond = jest.fn();
    render(
      <PermissionCard permission={makePermission()} onRespond={onRespond} />,
    );
    fireEvent.click(screen.getByText("Reject"));
    expect(onRespond).toHaveBeenCalledWith("reject");
  });

  it("renders three action buttons", () => {
    render(
      <PermissionCard permission={makePermission()} onRespond={jest.fn()} />,
    );
    expect(screen.getByText("Always")).toBeInTheDocument();
    expect(screen.getByText("Once")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("does not show description when not provided", () => {
    const { container } = render(
      <PermissionCard permission={makePermission()} onRespond={jest.fn()} />,
    );
    expect(container.textContent).not.toContain("Writes to");
  });
});
