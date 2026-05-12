import { useUIStore } from "@/store/ui";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      fontSize: 13,
      modal: null,
    });
  });

  it("has default fontSize of 13", () => {
    expect(useUIStore.getState().fontSize).toBe(13);
  });

  it("opens a modal", () => {
    useUIStore.getState().openModal({ kind: "sessions" });
    expect(useUIStore.getState().modal).toEqual({ kind: "sessions" });
  });

  it("opens title edit modal", () => {
    useUIStore.getState().openTitleEdit();
    expect(useUIStore.getState().modal).toEqual({ kind: "title-edit" });
  });

  it("closes modal", () => {
    useUIStore.getState().openModal({ kind: "sessions" });
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modal).toBeNull();
  });

  it("sets font size", () => {
    useUIStore.getState().setFontSize(16);
    expect(useUIStore.getState().fontSize).toBe(16);
  });

  it("supports all modal kinds", () => {
    const kinds = [
      "sessions",
      "slash",
      "mention",
      "model",
      "agent",
      "workdir",
      "title-edit",
    ] as const;
    for (const kind of kinds) {
      useUIStore.getState().openModal({ kind });
      expect(useUIStore.getState().modal).toEqual({ kind });
    }
  });

  it("supports file-view modal with path", () => {
    useUIStore.getState().openModal({ kind: "file-view", path: "README.md" });
    expect(useUIStore.getState().modal).toEqual({
      kind: "file-view",
      path: "README.md",
    });
  });
});
