"use client"

import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  type: 'alert' | 'zone' | 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number; // ms, default 5000
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-20 right-4 z-[10000] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'alert':
        return {
          bg: 'bg-red-600',
          border: 'border-red-700',
          icon: '🚨',
          progressBg: 'bg-red-400'
        };
      case 'zone':
        return {
          bg: 'bg-orange-500',
          border: 'border-orange-600',
          icon: '📍',
          progressBg: 'bg-orange-300'
        };
      case 'success':
        return {
          bg: 'bg-green-600',
          border: 'border-green-700',
          icon: '✅',
          progressBg: 'bg-green-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-600',
          icon: '⚠️',
          progressBg: 'bg-yellow-300'
        };
      case 'error':
        return {
          bg: 'bg-red-700',
          border: 'border-red-800',
          icon: '❌',
          progressBg: 'bg-red-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-600',
          border: 'border-blue-700',
          icon: 'ℹ️',
          progressBg: 'bg-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-600',
          border: 'border-gray-700',
          icon: '📢',
          progressBg: 'bg-gray-400'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      // className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-2xl p-4 min-w-[320px] cursor-pointer transform transition-all duration-300 ${
      //   isExiting ? 'translate-x-[400px] opacity-0' : 'translate-x-0 opacity-100'
      // } hover:scale-105`}
        className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-2xl p-4 min-w-[320px] cursor-pointer transform transition-all duration-300 hover:scale-105 toast-enter`}
      onClick={handleDismiss}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{styles.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm mb-1">{toast.title}</h4>
          <p className="text-white/90 text-xs whitespace-pre-line">{toast.message}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="text-white/70 hover:text-white flex-shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full ${styles.progressBg} animate-progress`}
          style={{
            animation: `progress ${toast.duration || 5000}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
}
