/**
 * Memory page — Browse, search, pin, archive, and delete agent memories.
 *
 * Data comes from the server-side /memory/* API (M5).
 * The page reads the active server config from the server store.
 */
import { useState, useEffect, useCallback } from "react";
import { useServerStore } from "../store/server";
import { useMemoryStore } from "../plugin/memory/store/memoryStore";
import { createMemoryApi } from "../services/memoryApi";
import { MemoryCard } from "../plugin/memory/ui/components/MemoryCard";
import { CategoryFilter } from "../plugin/memory/ui/components/CategoryFilter";
import { TimelineFeed } from "../plugin/memory/ui/components/TimelineFeed";
import { ProfilePanel } from "../plugin/memory/ui/components/ProfilePanel";
import { EmptyState } from "../plugin/memory/ui/components/EmptyState";
import type { FilterCategory } from "../plugin/memory/ui/components/CategoryFilter";
import { createProviderFromConfig } from "../plugin/memory/embeddings/EmbeddingProviderFactory";
import { colors, fonts, fontSizes } from "../theme";
import { friendlyError } from "../lib/errors";
import { Input } from "../components/ui/Input";

export function Memory() {
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const hydrated = useServerStore((s) => s.hydrated);
  const hydrate = useServerStore((s) => s.hydrate);

  const activeServer = servers.find((s) => s.id === activeId) ?? null;

  const memories = useMemoryStore((s) => s.memories);
  const memoryCount = useMemoryStore((s) => s.memoryCount);
  const isExtracting = useMemoryStore((s) => s.isExtracting);
  const loadForServer = useMemoryStore((s) => s.loadForServer);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const pinMemory = useMemoryStore((s) => s.pinMemory);
  const archiveMemory = useMemoryStore((s) => s.archiveMemory);
  const config = useMemoryStore((s) => s.config);

  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof memories | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"text" | "semantic">("text");
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [viewMode, setViewMode] = useState<"memories" | "timeline" | "profile">("memories");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Hydrate server store on mount
  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  // Load memories when active server changes
  useEffect(() => {
    if (!activeServer) return;
    void loadForServer(activeServer.id, activeServer).catch((e: unknown) => {
      setError(friendlyError(e));
    });
  }, [activeServer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced text search
  useEffect(() => {
    if (searchMode !== "text" || !searchQuery.trim() || !activeServer) {
      if (searchMode !== "text") setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      const api = createMemoryApi(activeServer);
      api
        .searchMemories(activeServer.id, searchQuery)
        .then(({ memories: results }) => {
          setSearchResults(results);
        })
        .catch((e: unknown) => {
          setSearchResults([]);
          setError(friendlyError(e));
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeServer?.id, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Semantic search (runs when searchMode is "semantic")
  useEffect(() => {
    if (searchMode !== "semantic" || !searchQuery.trim() || !activeServer || !config) {
      if (searchMode !== "semantic") setSearchResults(null);
      return;
    }

    let cancelled = false;
    setIsEmbedding(true);

    const doSemanticSearch = async () => {
      try {
        // Create embedding provider from memory config
        const provider = await createProviderFromConfig({
          modelId: config.embeddingModel,
          provider: config.embeddingProvider,
          serverUrl: activeServer.url,
        });

        // Generate query embedding
        const [queryVector] = await provider.embed([searchQuery], "query");

        if (cancelled) return;

        // Search via server
        const api = createMemoryApi(activeServer);
        const { results } = await api.semanticSearch(
          activeServer.id,
          queryVector,
          config.embeddingModel,
          config.topK,
        );

        if (cancelled) return;
        setSearchResults(results.map((r) => r.memory));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(friendlyError(e));
        setSearchResults([]);
      } finally {
        if (!cancelled) setIsEmbedding(false);
      }
    };

    // Debounce 500ms for semantic (embedding generation is expensive)
    const timer = setTimeout(() => {
      void doSemanticSearch();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchMode, activeServer?.id, config?.embeddingModel, config?.embeddingProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePin = useCallback(
    (id: string, isPinned: boolean) => {
      if (!activeServer) return;
      void pinMemory(id, isPinned, activeServer);
    },
    [pinMemory, activeServer],
  );

  const handleArchive = useCallback(
    (id: string) => {
      if (!activeServer) return;
      void archiveMemory(id, activeServer);
    },
    [archiveMemory, activeServer],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!activeServer) return;
      void deleteMemory(id, activeServer);
    },
    [deleteMemory, activeServer],
  );

  const handleExport = useCallback(async () => {
    if (!activeServer) return;
    setIsExporting(true);
    setError(null);
    try {
      const api = createMemoryApi(activeServer);
      const data = await api.exportAll(activeServer.id);
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pilot-memory-${activeServer.id}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setIsExporting(false);
    }
  }, [activeServer]);

  const handleImport = useCallback(async () => {
    if (!activeServer) return;
    // Create a hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      setError(null);
      setImportMessage(null);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const api = createMemoryApi(activeServer);
        const result = await api.importAll(activeServer.id, data);
        setImportMessage(
          `Imported: ${result.imported.memories} memories, ${result.imported.profile} profile entries, ${result.imported.timeline} timeline events`,
        );
        // Reload memories after import
        loadForServer(activeServer.id, activeServer).catch(() => {});
      } catch (e: unknown) {
        setError(friendlyError(e));
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  }, [activeServer, loadForServer]);

  if (!activeServer) {
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
          fontSize: fontSizes.sm,
        }}
      >
        no server configured — add one in Settings
      </div>
    );
  }

  const baseList = searchResults ?? memories;
  const displayed =
    filter === "all" ? baseList : baseList.filter((m) => m.category === filter);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        data-testid="memory-header"
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
              color: colors.text,
              fontWeight: 600,
            }}
          >
            Memory
          </span>
          <span
            data-testid="memory-count"
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              color: colors.muted,
              backgroundColor: colors.surfaceAlt,
              padding: "2px 7px",
              borderRadius: 10,
            }}
          >
            {memoryCount}
          </span>
          {isExtracting && (
            <span
              data-testid="memory-extracting"
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: colors.accent,
              }}
            >
              extracting…
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          <button
            data-testid="view-mode-memories"
            onClick={() => setViewMode("memories")}
            style={{
              padding: "3px 8px",
              background: viewMode === "memories" ? colors.accent : "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: viewMode === "memories" ? "#000" : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
            }}
          >
            memories
          </button>
          <button
            data-testid="view-mode-timeline"
            onClick={() => setViewMode("timeline")}
            style={{
              padding: "3px 8px",
              background: viewMode === "timeline" ? colors.accent : "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: viewMode === "timeline" ? "#000" : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
            }}
          >
            timeline
          </button>
          <button
            data-testid="view-mode-profile"
            onClick={() => setViewMode("profile")}
            style={{
              padding: "3px 8px",
              background: viewMode === "profile" ? colors.accent : "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: viewMode === "profile" ? "#000" : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
            }}
          >
            profile
          </button>
          </div>

        {viewMode === "memories" && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              data-testid="export-memories"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isExporting ? "…" : "export"}
            </button>
            <button
              data-testid="import-memories"
              onClick={handleImport}
              disabled={isImporting}
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isImporting ? "…" : "import"}
            </button>
          </div>
        )}

        {viewMode === "memories" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search mode toggle */}
          <button
            data-testid="search-mode-text"
            onClick={() => { setSearchMode("text"); setSearchResults(null); }}
            style={{
              padding: "4px 8px",
              background: searchMode === "text" ? colors.accent : "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: searchMode === "text" ? "#000" : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
            }}
          >
            text
          </button>
          <button
            data-testid="search-mode-semantic"
            onClick={() => { setSearchMode("semantic"); setSearchResults(null); }}
            style={{
              padding: "4px 8px",
              background: searchMode === "semantic" ? colors.accent : "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: searchMode === "semantic" ? "#000" : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: "pointer",
            }}
            disabled={!config}
            title={!config ? "No memory config loaded" : "Semantic search using embeddings"}
          >
            semantic
          </button>

          {/* Search */}
          <Input
            data-testid="memory-search"
            type="search"
            aria-label="Search memories"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === "semantic" ? "semantic search…" : "search memories…"}
            style={{
              fontFamily: fonts.mono,
              flex: 1,
              maxWidth: 300,
              padding: "6px 10px",
            }}
          />
        </div>
        )}
      </div>

      {/* Category filter tabs */}
      {viewMode === "memories" && (
      <CategoryFilter value={filter} onChange={setFilter} />
      )}

      {/* Error */}
      {error && (
        <div
          data-testid="memory-error"
          style={{
            padding: "8px 16px",
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {importMessage && (
        <div
          data-testid="import-message"
          style={{
            padding: "8px 16px",
            color: colors.success,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            flexShrink: 0,
          }}
        >
          {importMessage}
        </div>
      )}

      {/* Memory list / Timeline / Profile */}
      {viewMode === "memories" ? (
        <div data-testid="memory-list" style={{ flex: 1, overflowY: "auto" }}>
          {isSearching || isEmbedding ? (
            <div
              data-testid="memory-searching"
              style={{
                padding: 24,
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                textAlign: "center",
              }}
            >
              {isEmbedding ? "generating embedding…" : "searching…"}
            </div>
          ) : displayed.length === 0 ? (
            <div data-testid="memory-list-empty">
              <EmptyState
                message={
                searchQuery
                  ? `no memories matching "${searchQuery}"`
                  : filter !== "all"
                    ? `no ${filter} memories`
                    : undefined
              }
            />
            </div>
          ) : (
            displayed.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                onPin={handlePin}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      ) : viewMode === "timeline" ? (
        <TimelineFeed serverId={activeServer.id} server={activeServer} />
      ) : (
        <ProfilePanel serverId={activeServer.id} server={activeServer} />
      )}
    </div>
  );
}
