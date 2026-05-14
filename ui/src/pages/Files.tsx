/**
 * Files page: split-pane file browser with CodeMirror preview.
 *
 * Left pane: directory tree (click to navigate, click file to preview).
 * Right pane: read-only CodeMirror viewer for the selected file.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerStore } from "../store/server";
import { OpencodeClient } from "../services/api";
import type { FileNode } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";
import { CodeMirrorViewer } from "../components/CodeMirrorViewer";

interface SelectedFile {
  path: string;
  name: string;
  content: string;
}

export function Files() {
  const server = useServerStore((s) => s.active());
  const client = server ? new OpencodeClient(server) : null;
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const openFile = useCallback(
    async (node: FileNode) => {
      if (!client || node.type === "directory") return;
      setPreviewLoading(true);
      try {
        const fc = await client.fileContent(node.path);
        setSelected({
          path: node.path,
          name: node.name,
          content: typeof fc.content === "string" ? fc.content : "",
        });
      } catch (err) {
        log.error("files", "fileContent failed", err);
        setSelected({
          path: node.path,
          name: node.name,
          content: `(error loading file: ${err instanceof Error ? err.message : String(err)})`,
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url],
  );

  if (!server) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
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
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Left pane: file tree */}
      <div
        style={{
          width: 280,
          minWidth: 180,
          maxWidth: 400,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes.md,
              color: colors.text,
              margin: 0,
              flex: 1,
            }}
          >
            Files
          </h1>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              color: colors.muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 120,
            }}
            title={path || "/"}
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
                padding: "2px 8px",
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ← up
            </button>
          )}
        </div>

        {/* Error */}
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
              margin: 8,
            }}
          >
            {error}
          </div>
        )}

        {/* File list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                textAlign: "center",
                padding: 24,
              }}
            >
              loading…
            </div>
          ) : (
            <>
              {files.map((f) => {
                const isSelectedFile =
                  f.type === "file" && selected?.path === f.path;
                return (
                  <button
                    key={f.path}
                    onClick={() => {
                      if (f.type === "directory") {
                        setPath(f.path);
                      } else {
                        void openFile(f);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      width: "100%",
                      backgroundColor: isSelectedFile
                        ? "rgba(79,195,247,0.1)"
                        : "transparent",
                      border: "none",
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      color: isSelectedFile ? colors.accent : colors.text,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.sm,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "background-color 0.1s",
                      overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelectedFile) {
                        e.currentTarget.style.backgroundColor =
                          colors.surfaceAlt;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelectedFile) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {f.type === "directory" ? "📁" : "📄"}
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
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
            </>
          )}
        </div>
      </div>

      {/* Right pane: CodeMirror preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {selected ? (
          <>
            {/* Preview header */}
            <div
              style={{
                padding: "8px 16px",
                borderBottom: `1px solid ${colors.border}`,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                color: colors.muted,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📄</span>
              <span style={{ color: colors.text }}>{selected.name}</span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selected.path}
              </span>
              {previewLoading && (
                <span style={{ marginLeft: "auto" }}>loading…</span>
              )}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <CodeMirrorViewer
                content={selected.content}
                filename={selected.name}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
            }}
          >
            select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}
