type ToastType = 'success' | 'error' | 'info';

export type ToastInput = {
  id: number;
  type?: ToastType;
  title?: string;
  message?: string;
};

type Listener = (toast: ToastInput) => void;

class ToastStore {
  private listeners = new Set<Listener>();
  private toastId = 0; // ✅ unique incremental id

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  show(toast: Omit<ToastInput, 'id'>) {
    const toastWithId: ToastInput = {
      id: ++this.toastId,   // ✅ ALWAYS UNIQUE
      ...toast,
    };

    this.listeners.forEach((l) => l(toastWithId));
  }

  clear() {
    this.listeners.clear();
  }
}

export const toastStore = new ToastStore();
