'use client';
import { useEffect, useRef, ReactNode } from 'react';
export function Modal({ children, onClose, label, busy = false }: { children: ReactNode; onClose: () => void; label: string; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    ref.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={label} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="app-dialog">{children}</dialog>;
}
