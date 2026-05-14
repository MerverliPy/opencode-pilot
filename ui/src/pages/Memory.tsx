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
import { EmptyState } from "../plugin/memory/ui/components/EmptyState";
import type { FilterCategory } from "../plugin/memory/ui/components/CategoryFilter";
import { colors, fonts, fontSizes } from "../theme";
import { friendlyError } from "../lib/errors";

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

  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof memories | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || !activeServer) {
      setSearchResults(null);
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
  }, [searchQuery, activeServer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Search */}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="search memories…"
          style={{
            flex: 1,
            maxWidth: 300,
            backgroundColor: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: "6px 10px",
            color: colors.text,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            outline: "none",
          }}
        />
      </div>

      {/* Category filter tabs */}
      <CategoryFilter value={filter} onChange={setFilter} />

      {/* Error */}
      {error && (
        <div
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

      {/* Memory list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isSearching ? (
          <div
            style={{
              padding: 24,
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              textAlign: "center",
            }}
          >
            searching…
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState
            message={
              searchQuery
                ? `no memories matching "${searchQuery}"`
                : filter !== "all"
                  ? `no ${filter} memories`
                  : undefined
            }
          />
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
    </div>
  );
}
