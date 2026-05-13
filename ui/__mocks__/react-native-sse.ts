/**
 * Mock for react-native-sse.
 * The real module is replaced by native EventSource in the web client.
 */
export default class EventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url = "";
  readyState = 0;

  constructor(_url: string, _opts?: unknown) {}

  addEventListener(_type: string, _cb: unknown): void {}
  removeEventListener(_type: string, _cb: unknown): void {}
  close(): void {}
}
