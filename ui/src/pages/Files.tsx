/**
 * Files page: browse the working directory tree.
 */
import { useEffect, useState } from "react";
import { useServerStore } from "../store/server";
import { OpencodeClient } from "../services/api";
import type { FileNode } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";

export function Files() {
  const server = useServerStore((s) => s.active());
  const client = server ? new OpencodeClient(server) : null;
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoading(true);
      try {
        const list = await client.listFiles(path);
        if (!cancelled) setFiles(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          log.error("files", "list failed", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id, server?.url, path]);

  if (!server) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
        }}
      >
        no server configured — go to settings
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.lg,
            color: colors.text,
            margin: 0,
          }}
        >
          Files
        </h1>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            color: colors.muted,
          }}
        >
          {path || "/"}
        </span>
        {path && (
          <button
            onClick={() => {
              const parent = path.substring(0, path.lastIndexOf("/"));
              setPath(parent);
            }}
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 4,
              padding: "4px 10px",
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            ← up
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(229,115,115,0.1)",
            border: `1px solid ${colors.error}`,
            borderRadius: 6,
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            textAlign: "center",
            padding: 40,
          }}
        >
          loading…
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => {
                if (f.type === "directory") {
                  setPath(f.path);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: colors.surface,
                border: "none",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                color: colors.text,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                textAlign: "left",
                cursor: f.type === "directory" ? "pointer" : "default",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => {
                if (f.type === "directory") {
                  e.currentTarget.style.backgroundColor = colors.surfaceAlt;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface;
              }}
            >
              <span style={{ fontSize: 16 }}>
                {f.type === "directory" ? "📁" : "📄"}
              </span>
              <span>{f.name}</span>
            </button>
          ))}
          {files.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              empty directory
            </div>
          )}
        </div>
      )}
    </div>
  );
}
