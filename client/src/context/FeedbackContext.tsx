'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type Tone = 'info' | 'success' | 'danger';
type ConfirmOptions = { title: string; message: string; confirmLabel?: string; tone?: Tone };
type TextOptions = ConfirmOptions & { defaultValue?: string; placeholder?: string; multiline?: boolean };

interface FeedbackContextValue {
  notify: (message: string, tone?: Tone) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
  requestText: (options: TextOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { input?: boolean; value?: string; placeholder?: string; multiline?: boolean }) | null>(null);
  const resolver = useRef<((value: any) => void) | null>(null);

  const notify = useCallback((message: string, tone: Tone = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const requestText = useCallback((options: TextOptions) => new Promise<string | null>(resolve => {
    resolver.current = resolve;
    setDialog({ ...options, input: true, value: options.defaultValue || '', placeholder: options.placeholder, multiline: options.multiline });
  }), []);

  const close = (value: boolean | string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };

  const Icon = toast?.tone === 'success' ? CheckCircle2 : toast?.tone === 'danger' ? XCircle : Info;

  return (
    <FeedbackContext.Provider value={{ notify, confirmAction, requestText }}>
      {children}
      {toast && (
        <div className={`app-toast app-toast-${toast.tone}`} role={toast.tone === 'danger' ? 'alert' : 'status'} aria-live="polite">
          <Icon size={19} aria-hidden="true" />
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
      {dialog && (
        <div className="feedback-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(dialog.input ? null : false); }}>
          <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            <div className={`feedback-dialog-icon ${dialog.tone || 'info'}`}>
              {dialog.tone === 'danger' ? <AlertTriangle /> : <Info />}
            </div>
            <div className="feedback-dialog-copy">
              <h2 id="feedback-title">{dialog.title}</h2>
              <p>{dialog.message}</p>
            </div>
            {dialog.input && (dialog.multiline ? (
              <textarea autoFocus value={dialog.value} placeholder={dialog.placeholder} onChange={event => setDialog({ ...dialog, value: event.target.value })} rows={4} />
            ) : (
              <input autoFocus value={dialog.value} placeholder={dialog.placeholder} onChange={event => setDialog({ ...dialog, value: event.target.value })} />
            ))}
            <div className="feedback-dialog-actions">
              <button type="button" className="secondary-action" onClick={() => close(dialog.input ? null : false)}>Cancel</button>
              <button type="button" className={dialog.tone === 'danger' ? 'danger-action' : 'primary-action'} disabled={dialog.input && !dialog.value?.trim()} onClick={() => close(dialog.input ? dialog.value?.trim() || null : true)}>{dialog.confirmLabel || 'Continue'}</button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used within FeedbackProvider');
  return value;
}
