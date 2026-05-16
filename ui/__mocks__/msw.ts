/**
 * Mock of the `msw` package for Jest tests.
 * Replaces MSW's http/HttpResponse with lightweight fetch-intercepting mocks.
 */

type Handler = {
  method: string;
  urlPattern: string;
  resolver: (opts: { params: Record<string, string> }) => unknown;
};

const registeredHandlers: Handler[] = [];
const activeHandlers: Handler[] = [];

function createHandler(method: string, urlPattern: string, resolver: Function): Handler {
  return { method, urlPattern, resolver: resolver as Handler["resolver"] };
}

function urlMatches(pattern: string, url: string): boolean {
  if (pattern.startsWith("*")) {
    return url.endsWith(pattern.slice(1));
  }
  return url === pattern;
}

function findHandler(method: string, url: string): Handler | undefined {
  // Check active handlers first (last added = highest priority)
  for (let i = activeHandlers.length - 1; i >= 0; i--) {
    const h = activeHandlers[i];
    if (h.method === method && urlMatches(h.urlPattern, url)) return h;
  }
  for (const h of registeredHandlers) {
    if (h.method === method && urlMatches(h.urlPattern, url)) return h;
  }
  return undefined;
}

async function fetchHandler(url: string, reqInit?: RequestInit): Promise<HttpResponse> {
  const method = reqInit?.method ?? "GET";
  const matched = findHandler(method, url.toString());
  if (matched) {
    const res = await matched.resolver({ params: {} });
    if (res instanceof HttpResponse) return res;
    return HttpResponse.json(res);
  }
  return new HttpResponse("Not found", { status: 404 });
}

export const http = {
  get: (url: string, resolver: Function) => createHandler("GET", url, resolver),
  post: (url: string, resolver: Function) => createHandler("POST", url, resolver),
};

export class HttpResponse {
  readonly body: string;
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;

  constructor(body: string, options?: { status?: number }) {
    this.body = body;
    this.status = options?.status ?? 200;
    this.statusText = this.status >= 200 && this.status < 300 ? "OK" : "Error";
    this.ok = this.status >= 200 && this.status < 300;
  }

  static json(data: unknown, options?: { status?: number }): HttpResponse {
    const body = JSON.stringify(data);
    const inst = new HttpResponse(body, options);
    return inst;
  }

  json<T = unknown>(): Promise<T> {
    return Promise.resolve(JSON.parse(this.body) as T);
  }

  text(): Promise<string> {
    return Promise.resolve(this.body);
  }
}

export function setupServer(...handlers: Handler[]) {
  registeredHandlers.length = 0;
  activeHandlers.length = 0;
  registeredHandlers.push(...handlers);

  return {
    listen: () => {
      globalThis.fetch = jest
        .fn()
        .mockImplementation(
          (url: string | URL | Request, reqInit?: RequestInit) =>
            fetchHandler(url.toString(), reqInit),
        );
    },
    resetHandlers: () => {
      activeHandlers.length = 0;
    },
    close: () => {
      registeredHandlers.length = 0;
      activeHandlers.length = 0;
    },
    use: (...newHandlers: Handler[]) => {
      activeHandlers.push(...newHandlers);
    },
  };
}
