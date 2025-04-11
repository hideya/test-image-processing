import { useState, useEffect } from 'react';

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

// Create a single instance of state that can be shared across the app
const TOAST_LIMIT = 5;
const TOAST_REMOVAL_DELAY = 1000;

type ToasterState = {
  toasts: Toast[];
};

const toasterState: ToasterState = {
  toasts: [],
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toasterState.toasts);

  useEffect(() => {
    toasterState.toasts = toasts;
  }, [toasts]);

  const toast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 5000,
      action: options.action,
    };

    setToasts((prevToasts) => {
      const nextToasts = [...prevToasts, newToast].slice(-TOAST_LIMIT);
      return nextToasts;
    });

    return {
      id,
      dismiss: () => dismissToast(id),
      update: (props: Partial<ToastOptions>) => updateToast(id, props),
    };
  };

  const dismissToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const updateToast = (id: string, props: Partial<ToastOptions>) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, ...props } : toast
      )
    );
  };

  return {
    toast,
    toasts,
    dismissToast,
    updateToast,
  };
}