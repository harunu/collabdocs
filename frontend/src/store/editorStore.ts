import { create } from 'zustand';

interface EditorState {
  activeDocumentId: string | null;
  sidebarOpen: boolean;
  versionPanelOpen: boolean;
  setActiveDocumentId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleVersionPanel: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeDocumentId: null,
  sidebarOpen: true,
  versionPanelOpen: false,
  setActiveDocumentId: (id) => set({ activeDocumentId: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleVersionPanel: () => set((state) => ({ versionPanelOpen: !state.versionPanelOpen })),
}));
