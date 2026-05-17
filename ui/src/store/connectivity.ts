import { create } from 'zustand';

type ConnectivityState = {
  online: boolean;
  setOnline: (online: boolean) => void;
};

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  online: navigator.onLine,
  setOnline: (online) => set({ online }),
}));

// Listen for browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useConnectivityStore.getState().setOnline(true);
  });
  window.addEventListener('offline', () => {
    useConnectivityStore.getState().setOnline(false);
  });
}
