import { log } from "../logger";
import { useLogStore } from "../../store/log";

describe("logger", () => {
  beforeEach(() => {
    useLogStore.getState().clearLog();
    jest.clearAllMocks();
  });

  describe("log.debug", () => {
    it("adds a debug entry to the store", () => {
      log.debug("test", "hello");
      const entries = useLogStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe("debug");
      expect(entries[0].tag).toBe("test");
      expect(entries[0].message).toBe("hello");
    });

    it("serializes object extras", () => {
      log.debug("api", "request", { status: 200 });
      const entry = useLogStore.getState().entries[0];
      expect(entry.data).toBe(JSON.stringify({ status: 200 }, null, 2));
    });

    it("handles undefined extra", () => {
      log.debug("test", "msg");
      const entry = useLogStore.getState().entries[0];
      expect(entry.data).toBeUndefined();
    });

    it("handles string extra", () => {
      log.debug("test", "msg", "raw string");
      const entry = useLogStore.getState().entries[0];
      expect(entry.data).toBe("raw string");
    });

    it("handles circular reference gracefully", () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      log.debug("test", "circular", obj);
      const entry = useLogStore.getState().entries[0];
      expect(entry.data).toBe("[object Object]");
    });
  });

  describe("log.info", () => {
    it("adds an info entry", () => {
      log.info("boot", "started");
      expect(useLogStore.getState().entries[0].level).toBe("info");
    });
  });

  describe("log.warn", () => {
    it("adds a warn entry", () => {
      log.warn("net", "slow");
      expect(useLogStore.getState().entries[0].level).toBe("warn");
    });
  });

  describe("log.error", () => {
    it("adds an error entry", () => {
      log.error("api", "failed");
      expect(useLogStore.getState().entries[0].level).toBe("error");
    });
  });

  describe("ring buffer limit", () => {
    it("keeps at most MAX_ENTRIES (100)", () => {
      for (let i = 0; i < 105; i++) {
        log.info("flood", String(i));
      }
      expect(useLogStore.getState().entries).toHaveLength(100);
    });

    it("evicts oldest entries first", () => {
      for (let i = 0; i < 102; i++) {
        log.info("flood", String(i));
      }
      const entries = useLogStore.getState().entries;
      expect(entries[entries.length - 1].message).toBe("2");
      expect(entries[0].message).toBe("101");
    });
  });

  describe("unique IDs", () => {
    it("generates unique ids per entry", () => {
      log.info("a", "msg-a");
      log.info("b", "msg-b");
      const [e1, e2] = useLogStore.getState().entries;
      expect(e1.id).not.toBe(e2.id);
    });
  });
});
