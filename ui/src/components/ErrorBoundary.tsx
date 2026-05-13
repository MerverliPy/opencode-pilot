import { Component, type ErrorInfo, type ReactNode } from "react";
import { colors, fonts } from "../theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            gap: 16,
            fontFamily: fonts.sans,
            color: colors.text,
          }}
        >
          <span style={{ fontSize: 48 }}>⚠</span>
          <h2 style={{ margin: 0, fontSize: 18 }}>Something went wrong</h2>
          <pre
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.error,
              maxWidth: 600,
              overflow: "auto",
              padding: 12,
              background: colors.surface,
              borderRadius: 8,
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              background: colors.accent,
              color: colors.bg,
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
