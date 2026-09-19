import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "createdAt">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${++counter}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { ...toast, id, createdAt: Date.now() }],
    }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, 6000);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
