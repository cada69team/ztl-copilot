"use client"

import { useState, useCallback } from 'react';
import { ToastMessage } from '@/components/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastMessage['type'],
    title: string,
    message: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: duration || 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Helper methods for common toast types
  const showAlert = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('alert', title, message, duration);
    },
    [addToast]
  );

  const showZone = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('zone', title, message, duration);
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('success', title, message, duration);
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('warning', title, message, duration);
    },
    [addToast]
  );

  const showError = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('error', title, message, duration);
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast('info', title, message, duration);
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    showAlert,
    showZone,
    showSuccess,
    showWarning,
    showError,
    showInfo,
  };
}
