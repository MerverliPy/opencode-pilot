import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// Suppress console.error from React caught errors
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

const ThrowChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("shows default fallback on thrown error", () => {
    render(
      <ErrorBoundary>
        <ThrowChild message="boom" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">Custom Error</div>}>
        <ThrowChild message="boom" />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("calls onError callback when error is caught", () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowChild message="boom" />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    expect(onError.mock.calls[0][0].message).toBe("boom");
  });

  it("resets error state when Try Again is clicked and children are fixed", () => {
    function TestWrapper() {
      const [bad, setBad] = useState(true);
      return (
        <>
          <button data-testid="fix" onClick={() => setBad(false)}>
            Fix
          </button>
          <ErrorBoundary>
            {bad ? <ThrowChild message="boom" /> : <div data-testid="recovered">Recovered</div>}
          </ErrorBoundary>
        </>
      );
    }

    render(<TestWrapper />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the children so they no longer throw
    fireEvent.click(screen.getByTestId("fix"));
    // Now click Try Again
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByTestId("recovered")).toBeInTheDocument();
  });
});
