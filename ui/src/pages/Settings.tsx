/**
 * Settings page: manage server connections.
 */
import { useState, useEffect } from "react";
import { useServerStore } from "../store/server";
import type { ServerConfig } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { PushSettings } from "../components/PushSettings";
import { TunnelSettings } from "../components/TunnelSettings";

export function Settings() {
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const hydrated = useServerStore((s) => s.hydrated);
  const hydrate = useServerStore((s) => s.hydrate);
  const upsert = useServerStore((s) => s.upsert);
  const remove = useServerStore((s) => s.remove);
  const setActive = useServerStore((s) => s.setActive);

  const [editing, setEditing] = useState<ServerConfig | null>(null);
  const [form, setForm] = useState({
    name: "",
    url: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const startAdd = () => {
    setEditing({ id: crypto.randomUUID(), name: "", url: "" });
    setForm({ name: "", url: "", username: "", password: "" });
  };

  const startEdit = (s: ServerConfig) => {
    setEditing(s);
    setForm({
      name: s.name,
      url: s.url,
      username: s.username ?? "",
      password: s.password ?? "",
    });
  };

  const save = async () => {
    if (!editing) return;
    const cfg: ServerConfig = {
      ...editing,
      name: form.name.trim(),
      url: form.url.trim(),
      username: form.username.trim() || undefined,
      password: form.password.trim() || undefined,
    };
    await upsert(cfg);
    setEditing(null);
  };

  const cancel = () => setEditing(null);

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto", flex: 1, minHeight: 0, overflow: "auto" }}>
      <h1
        style={{
          fontFamily: fonts.sans,
          fontSize: fontSizes.lg,
          color: colors.text,
          margin: "0 0 20px",
        }}
      >
        Settings
      </h1>

      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.md,
            color: colors.text,
            margin: "0 0 12px",
          }}
        >
          Servers
        </h2>

        {servers.length === 0 ? (
          <div
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              padding: "12px 0",
            }}
          >
            no servers configured
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {servers.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor:
                        s.id === activeId ? colors.success : colors.muted,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.sm,
                        color: colors.text,
                      }}
                    >
                      {s.name || s.url}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.xs,
                        color: colors.muted,
                      }}
                    >
                      {s.url}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {s.id !== activeId && (
                    <button
                      onClick={() => void setActive(s.id)}
                      style={{
                        backgroundColor: colors.accent,
                        color: "#000",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 10px",
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.xs,
                        cursor: "pointer",
                      }}
                    >
                      activate
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(s)}
                    style={{
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      cursor: "pointer",
                    }}
                  >
                    edit
                  </button>
                  <button
                    onClick={() => void remove(s.id)}
                    style={{
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.error}`,
                      color: colors.error,
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      cursor: "pointer",
                    }}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={startAdd}
          style={{
            marginTop: 12,
            backgroundColor: colors.surfaceAlt,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: "8px 14px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            cursor: "pointer",
          }}
        >
          + Add Server
        </button>
      </section>

      <PushSettings />
      <TunnelSettings />

      {/* Edit / Add modal */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 20,
              width: "90%",
              maxWidth: 400,
            }}
          >
            <h3
              style={{
                fontFamily: fonts.sans,
                fontSize: fontSizes.md,
                color: colors.text,
                margin: "0 0 16px",
              }}
            >
              {servers.find((s) => s.id === editing.id)
                ? "Edit Server"
                : "Add Server"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.muted,
                  }}
                >
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: colors.text,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.muted,
                  }}
                >
                  URL
                </span>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="http://localhost:4096"
                  style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: colors.text,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.muted,
                  }}
                >
                  Username (optional)
                </span>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: colors.text,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    outline: "none",
                  }}
                />
              </label>

              <label
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.muted,
                  }}
                >
                  Password (optional)
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  style={{
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: colors.text,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button
                onClick={cancel}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  borderRadius: 4,
                  padding: "6px 12px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  cursor: "pointer",
                }}
              >
                cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={!form.name.trim() || !form.url.trim()}
                style={{
                  backgroundColor:
                    !form.name.trim() || !form.url.trim()
                      ? colors.border
                      : colors.accent,
                  color: "#000",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 12px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  cursor:
                    !form.name.trim() || !form.url.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity: !form.name.trim() || !form.url.trim() ? 0.5 : 1,
                }}
              >
                save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
