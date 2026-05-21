/**
 * Login page — httpOnly session cookie auth.
 *
 * Presents a minimal centered login form. On success, navigates to "/".
 * Uses the Zustand server store for the `login` action.
 */
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useServerStore } from "../store/server";
import { colors, fonts } from "../theme";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginAction = useServerStore((s) => s.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const ok = await loginAction(username, password);
      if (ok) {
        navigate("/", { replace: true });
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        minHeight: 0,
        backgroundColor: colors.bg,
        padding: 24,
      }}
    >
      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <h1
          style={{
            fontFamily: fonts.mono,
            fontSize: 18,
            color: colors.text,
            margin: 0,
            textAlign: "center",
          }}
        >
          pilot login
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="login-username"
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
            }}
          >
            Username
          </label>
          <Input
            id="login-username"
            type="text"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="username"
            style={{
              fontFamily: fonts.sans,
              backgroundColor: colors.bg,
              fontSize: 14,
              padding: "10px 12px",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="login-password"
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
            }}
          >
            Password
          </label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="current-password"
            style={{
              fontFamily: fonts.sans,
              backgroundColor: colors.bg,
              fontSize: 14,
              padding: "10px 12px",
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.error,
              textAlign: "center",
              padding: "8px 12px",
              backgroundColor: colors.errorTint,
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="md"
          type="submit"
          disabled={loading}
        >
          {loading ? "signing in…" : "sign in"}
        </Button>
      </form>
    </div>
  );
}
