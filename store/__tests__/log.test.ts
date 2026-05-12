import { useLogStore } from "@/store/log";

describe("useLogStore", () => {
  beforeEach(() => {
    useLogStore.getState().clearLog();
  });

  it("starts with empty entries", () => {
    expect(useLogStore.getState().entries).toEqual([]);
  });

  it("adds entries to the front", () => {
    useLogStore.getState().addEntry({
      id: "1",
      ts: 1000,
      level: "info",
      tag: "test",
      message: "first",
    });
    useLogStore.getState().addEntry({
      id: "2",
      ts: 2000,
      level: "info",
      tag: "test",
      message: "second",
    });
    const entries = useLogStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe("second");
    expect(entries[1].message).toBe("first");
  });

  it("caps at MAX_ENTRIES (100)", () => {
    for (let i = 0; i < 105; i++) {
      useLogStore.getState().addEntry({
        id: String(i),
        ts: i,
        level: "info",
        tag: "flood",
        message: String(i),
      });
    }
    expect(useLogStore.getState().entries).toHaveLength(100);
  });

  it("clears all entries", () => {
    useLogStore.getState().addEntry({
      id: "1",
      ts: 1000,
      level: "info",
      tag: "test",
      message: "msg",
    });
    useLogStore.getState().clearLog();
    expect(useLogStore.getState().entries).toEqual([]);
  });
});
