import { create } from "zustand";

type ModalKind =
  | { kind: "sessions" }
  | { kind: "slash" }
  | { kind: "mention" }
  | { kind: "model" }
  | { kind: "agent" }
  | { kind: "file-view"; path: string }
  | { kind: "workdir" }
  | { kind: "title-edit" }
  | null;

type UIState = {
  fontSize: number;
  modal: ModalKind;
  openModal: (m: NonNullable<ModalKind>) => void;
  openTitleEdit: () => void;
  closeModal: () => void;
  setFontSize: (n: number) => void;
};

export const useUIStore = create<UIState>((set) => ({
  fontSize: 13,
  modal: null,
  openModal: (m) => set({ modal: m }),
  openTitleEdit: () => set({ modal: { kind: "title-edit" } }),
  closeModal: () => set({ modal: null }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
