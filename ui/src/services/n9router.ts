/**
 * N9RouterClient — lightweight HTTP client for the n9router API.
 *
 * All methods are read-only except tunnelEnable / tunnelDisable.
 * Auth is via `Authorization: Bearer <key>` (key may be empty for
 * local deployments that have no auth configured).
 */

import type {
  N9RouterModelsResponse,
  N9RouterUsageStats,
  N9RouterTunnelStatus,
  ProviderSummary,
  N9RouterRequest,
} from "@pilot-shared/types";

export type {
  N9RouterModelsResponse,
  N9RouterUsageStats,
  N9RouterTunnelStatus,
  ProviderSummary,
  N9RouterRequest,
};

export class N9RouterClient {
  constructor(
    public readonly baseUrl: string,
    public readonly apiKey: string = "",
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  private url(path: string, query?: Record<string, string>): string {
    const base = this.baseUrl.replace(/\/$/, "");
    if (!query) return `${base}${path}`;
    const qs = new URLSearchParams(query).toString();
    return `${base}${path}?${qs}`;
  }

  private async get<T>(
    path: string,
    query?: Record<string, string>,
  ): Promise<T> {
    const res = await fetch(this.url(path, query), {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`n9router ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`n9router POST ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** GET /api/health */
  health(): Promise<{ ok: boolean }> {
    return this.get("/api/health");
  }

  /** GET /v1/models — full OpenAI-compatible model list */
  models(): Promise<N9RouterModelsResponse> {
    return this.get("/v1/models");
  }

  /** GET /api/combos — combo model definitions */
  combos(): Promise<{
    combos: Array<{ id: string; name: string; [key: string]: unknown }>;
  }> {
    return this.get("/api/combos");
  }

  /** GET /api/usage/stats?period=24h */
  usageStats(period = "24h"): Promise<N9RouterUsageStats> {
    return this.get("/api/usage/stats", { period });
  }

  /** GET /api/tunnel/status */
  tunnelStatus(): Promise<N9RouterTunnelStatus> {
    return this.get("/api/tunnel/status");
  }

  /** POST /api/tunnel/enable */
  tunnelEnable(): Promise<N9RouterTunnelStatus> {
    return this.post("/api/tunnel/enable");
  }

  /** POST /api/tunnel/disable */
  tunnelDisable(): Promise<N9RouterTunnelStatus> {
    return this.post("/api/tunnel/disable");
  }

  /** Aggregate recentRequests into per-provider summaries. */
  static summarizeByProvider(stats: N9RouterUsageStats): ProviderSummary[] {
    const map = new Map<string, ProviderSummary>();
    for (const r of stats.recentRequests ?? []) {
      const key = r.provider || "unknown";
      let s = map.get(key);
      if (!s) {
        s = {
          provider: key,
          requests: 0,
          success: 0,
          errors: 0,
          promptTokens: 0,
          completionTokens: 0,
        };
        map.set(key, s);
      }
      s.requests++;
      if (r.status === "success") s.success++;
      else s.errors++;
      s.promptTokens += r.promptTokens ?? 0;
      s.completionTokens += r.completionTokens ?? 0;
    }
    return Array.from(map.values()).sort((a, b) => b.requests - a.requests);
  }
}
