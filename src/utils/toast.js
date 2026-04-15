import { useState, useCallback } from 'react';

let toastId = 0;
const listeners = new Set();
let toasts = [];

function notify() {
  listeners.forEach(fn => fn([...toasts]));
}

export function showToast(message, type = 'info') {
  const id = ++toastId;
  toasts.push({ id, message, type });
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 4000);
}

export function useToasts() {
  const [state, setState] = useState([]);

  useState(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  });

  const removeToast = useCallback((id) => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, []);

  return { toasts: state, removeToast };
}
