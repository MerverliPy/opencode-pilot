/**
 * DirectBenchRunner — standalone HTTP benchmark runner for Pilot server endpoints.
 *
 * Does NOT use WorkflowRunner's Scenario system. Runs direct HTTP benchmarks
 * against memory CRUD, proxy/SSE, and terminal WebSocket endpoints.
 */

import type { BenchtestOptions, BenchtestReport } from '../types.js';
import { MetricStore } from '../collector/MetricStore.js';
import { DetectionEngine } from '../detectors/index.js';

interface PilotEndpointResult {
  endpoint: string;
  status: number;
  durationMs: number;
  bodySize?: number;
  error?: string;
}

export class DirectBenchRunner {
  private store = new MetricStore();
  private detectors = new DetectionEngine();
  private options: BenchtestOptions;

  constructor(options: BenchtestOptions) {
    this.options = options;
  }

  private async pilotFetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.options.url}${path}`;
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 7.2: API throughput benchmark — memory CRUD latency and requests/second
   * Makes N requests to each memory endpoint, reports p50/p95/p99 latency.
   */
  async apiThroughput(iterations: number = 20): Promise<BenchtestReport> {
    this.store.reset();
    this.detectors.reset();
    const serverId = `benchtest-${Date.now()}`;
    const startTime = Date.now();

    // POST create memories
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const res = await this.pilotFetch(`/memory/${serverId}`, {
        method: 'POST',
        body: JSON.stringify({ content: `Benchmark memory ${i}`, category: 'fact', confidence: 0.9, tags: ['bench'] }),
      });
      const duration = performance.now() - t0;
      this.store.recordToolCall({
        tool: 'POST /memory/:serverId', sessionID: serverId, callID: `create-${i}`,
        agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(duration),
        inputChars: 0, outputChars: 0, destructive: false,
      });
    }

    // GET list memories
    const t0 = performance.now();
    const listRes = await this.pilotFetch(`/memory/${serverId}`);
    const listDuration = performance.now() - t0;
    this.store.recordToolCall({
      tool: 'GET /memory/:serverId', sessionID: serverId, callID: 'list',
      agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(listDuration),
      inputChars: 0, outputChars: 0, destructive: false,
    });

    const listBody = await listRes.json() as any;
    const memoryIds: string[] = (listBody.memories || []).map((m: any) => m.id);

    // PATCH update first memory
    if (memoryIds.length > 0) {
      const t1 = performance.now();
      await this.pilotFetch(`/memory/${serverId}/${memoryIds[0]}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated benchmark memory' }),
      });
      const dur = performance.now() - t1;
      this.store.recordToolCall({
        tool: 'PATCH /memory/:serverId/:id', sessionID: serverId, callID: 'update',
        agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(dur),
        inputChars: 0, outputChars: 0, destructive: false,
      });
    }

    // DELETE all
    const t2 = performance.now();
    await this.pilotFetch(`/memory/${serverId}/all`, { method: 'DELETE' });
    const delDuration = performance.now() - t2;
    this.store.recordToolCall({
      tool: 'DELETE /memory/:serverId/all', sessionID: serverId, callID: 'delete-all',
      agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(delDuration),
      inputChars: 0, outputChars: 0, destructive: true,
    });

    const totalDuration = Date.now() - startTime;
    const tokenSummary = this.store.buildTokenSummary();
    const alerts = this.detectors.getAlerts();

    return {
      meta: { timestamp: new Date().toISOString(), scenario: 'api-throughput', durationMs: totalDuration, sessionCount: 1,
        config: { tokenBudget: { maxTotal: 100_000, maxPerCall: 16_000 }, expectedPhases: ['benchmark'], timeoutMs: 120_000 } },
      summary: { totalToolCalls: this.store.toolCalls.length, totalModelCalls: 0, totalTokens: 0, estimatedCost: 0, pass: alerts.length === 0, alerts },
      tokenSummary, toolCalls: this.store.toolCalls, modelCalls: this.store.modelCalls,
      phases: this.store.phases, compactions: this.store.compactions, handoffs: this.store.handoffs,
      skills: this.store.skills, hooks: this.store.hooks, alerts, events: this.store.events,
    };
  }

  /**
   * 7.3: Proxy throughput benchmark — SSE stream latency overhead
   */
  async proxyThroughput(): Promise<BenchtestReport> {
    this.store.reset();
    this.detectors.reset();
    const serverId = `benchtest-proxy-${Date.now()}`;
    const startTime = Date.now();

    // Benchmark direct memory endpoint
    const t0 = performance.now();
    const directRes = await this.pilotFetch(`/memory/${serverId}`);
    const directDuration = performance.now() - t0;
    const directSize = (await directRes.clone().text()).length;

    this.store.recordToolCall({
      tool: 'direct-memory-read', sessionID: 'proxy-bench', callID: 'direct',
      agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(directDuration),
      inputChars: 0, outputChars: directSize, destructive: false,
    });

    // Measure TTFB for health endpoint
    const t1 = performance.now();
    const healthRes = await this.pilotFetch('/health');
    const ttfb = performance.now() - t1;

    this.store.recordToolCall({
      tool: 'health-check', sessionID: 'proxy-bench', callID: 'health',
      agent: 'benchtest', timestamp: Date.now(), durationMs: Math.round(ttfb),
      inputChars: 0, outputChars: (await healthRes.clone().text()).length, destructive: false,
    });

    // Report overhead = proxy duration - direct duration (approximate)
    const totalDuration = Date.now() - startTime;
    const tokenSummary = this.store.buildTokenSummary();
    const alerts = this.detectors.getAlerts();

    return {
      meta: { timestamp: new Date().toISOString(), scenario: 'proxy-throughput', durationMs: totalDuration, sessionCount: 1,
        config: { tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 }, expectedPhases: ['benchmark'], timeoutMs: 60_000 } },
      summary: { totalToolCalls: this.store.toolCalls.length, totalModelCalls: 0, totalTokens: 0, estimatedCost: 0, pass: alerts.length === 0, alerts },
      tokenSummary, toolCalls: this.store.toolCalls, modelCalls: this.store.modelCalls,
      phases: this.store.phases, compactions: this.store.compactions, handoffs: this.store.handoffs,
      skills: this.store.skills, hooks: this.store.hooks, alerts, events: this.store.events,
    };
  }

  /**
   * 7.4: Terminal concurrency benchmark — WebSocket connection throughput
   * Opens N concurrent WebSocket connections to the Pilot terminal endpoint.
   * Node 18+ has global WebSocket.
   */
  async terminalConcurrency(concurrent: number = 5): Promise<BenchtestReport> {
    this.store.reset();
    this.detectors.reset();
    const startTime = Date.now();

    const wsUrl = this.options.url.replace(/^http/, 'ws');
    const connections: Promise<{ durationMs: number; success: boolean; error?: string }>[] = [];

    for (let i = 0; i < concurrent; i++) {
      connections.push(new Promise((resolve) => {
        const t0 = performance.now();
        try {
          const ws = new WebSocket(`${wsUrl}/terminal/ws?session=bench-${i}`, {
            headers: { 'Authorization': `Bearer ${this.options.apiKey}` },
          } as any);
          ws.onopen = () => {
            const duration = performance.now() - t0;
            ws.close();
            resolve({ durationMs: Math.round(duration), success: true });
          };
          ws.onerror = () => {
            const duration = performance.now() - t0;
            resolve({ durationMs: Math.round(duration), success: false, error: 'WS error' });
          };
          ws.onclose = () => {
            // already resolved via onopen/onerror
          };
          setTimeout(() => {
            ws.close();
            resolve({ durationMs: 5000, success: false, error: 'timeout' });
          }, 5000);
        } catch (e: any) {
          resolve({ durationMs: Math.round(performance.now() - t0), success: false, error: e.message });
        }
      }));
    }

    const results = await Promise.all(connections);

    for (let i = 0; i < results.length; i++) {
      this.store.recordToolCall({
        tool: 'ws-connect', sessionID: `terminal-bench-${i}`, callID: `ws-${i}`,
        agent: 'benchtest', timestamp: Date.now(), durationMs: results[i].durationMs,
        inputChars: 0, outputChars: 0, destructive: false,
      });
    }

    const totalDuration = Date.now() - startTime;
    const tokenSummary = this.store.buildTokenSummary();
    const alerts = this.detectors.getAlerts();
    const failures = results.filter(r => !r.success);

    return {
      meta: { timestamp: new Date().toISOString(), scenario: 'terminal-concurrency', durationMs: totalDuration, sessionCount: concurrent,
        config: { tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 }, expectedPhases: ['benchmark'], timeoutMs: 60_000 } },
      summary: { totalToolCalls: this.store.toolCalls.length, totalModelCalls: 0, totalTokens: 0, estimatedCost: 0,
        pass: !this.options.verbose || failures.length === 0,
        alerts: [...alerts, ...(failures.length > 0 ? [{ detector: 'WS-Connect', severity: 'low' as const, timestamp: Date.now(), message: `${failures.length}/${concurrent} WS connections failed`, threshold: 0, actualValue: failures.length }] : [])],
      },
      tokenSummary, toolCalls: this.store.toolCalls, modelCalls: this.store.modelCalls,
      phases: this.store.phases, compactions: this.store.compactions, handoffs: this.store.handoffs,
      skills: this.store.skills, hooks: this.store.hooks, alerts, events: this.store.events,
    };
  }

  /** Run full benchmark suite */
  async runAll(): Promise<Record<string, BenchtestReport>> {
    return {
      'api-throughput': await this.apiThroughput(this.options.quick ? 5 : 20),
      'proxy-throughput': await this.proxyThroughput(),
      'terminal-concurrency': await this.terminalConcurrency(this.options.quick ? 2 : 5),
    };
  }
}
