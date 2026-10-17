import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Czerwony przycisk potwierdzenia – operacje nieodwracalne lub usuwające. */
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  maxLength?: number;
  /** Komunikat błędu albo `null`, gdy wartość jest poprawna. */
  validate?: (value: string) => string | null;
}

interface Dialogs {
  confirm(o: ConfirmOptions): Promise<boolean>;
  prompt(o: PromptOptions): Promise<string | null>;
}

type Pending = { id: number } & (
  | ({ kind: 'confirm' } & ConfirmOptions & { resolve(v: boolean): void })
  | ({ kind: 'prompt' } & PromptOptions & { resolve(v: string | null): void })
);

const DialogContext = createContext<Dialogs | null>(null);
let nextId = 1;

/** Okna potwierdzenia i pytania w stylu aplikacji – zamiast systemowych `confirm()` / `prompt()`. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setQueue((q) => [...q, { id: nextId++, kind: 'confirm', ...o, resolve }])),
    [],
  );
  const prompt = useCallback(
    (o: PromptOptions) => new Promise<string | null>((resolve) => setQueue((q) => [...q, { id: nextId++, kind: 'prompt', ...o, resolve }])),
    [],
  );
  const [api] = useState<Dialogs>(() => ({ confirm, prompt }));

  const current = queue[0];
  const finish = useCallback((value: boolean | string | null) => {
    setQueue((q) => {
      const [head, ...rest] = q;
      if (head) (head.resolve as (v: typeof value) => void)(value);
      return rest;
    });
  }, []);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current?.kind === 'confirm' && <ConfirmDialog key={current.id} o={current} onDone={finish} />}
      {current?.kind === 'prompt' && <PromptDialog key={current.id} o={current} onDone={finish} />}
    </DialogContext.Provider>
  );
}

export function useDialogs(): Dialogs {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs() wymaga <DialogProvider>');
  return ctx;
}

function ConfirmDialog({ o, onDone }: { o: ConfirmOptions; onDone(v: boolean): void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => ok.current?.focus(), []);
  const cancel = useCallback(() => onDone(false), [onDone]);
  return (
    <Modal title={o.title ?? 'Potwierdź'} onClose={cancel} className="dialog">
      <div className="dialog-message">{o.message}</div>
      <div className="dialog-actions">
        <button type="button" onClick={cancel}>
          {o.cancelLabel ?? 'Anuluj'}
        </button>
        <button type="button" ref={ok} className={o.danger ? 'danger solid' : 'primary'} onClick={() => onDone(true)}>
          {o.confirmLabel ?? 'OK'}
        </button>
      </div>
    </Modal>
  );
}

function PromptDialog({ o, onDone }: { o: PromptOptions; onDone(v: string | null): void }) {
  const [value, setValue] = useState(o.defaultValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const cancel = useCallback(() => onDone(null), [onDone]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    const err = o.validate ? o.validate(v) : v ? null : 'Pole nie może być puste.';
    if (err) {
      setError(err);
      return;
    }
    onDone(v);
  };
  return (
    <Modal title={o.title} onClose={cancel} className="dialog">
      <form className="dialog-form" onSubmit={submit}>
        <label>
          {o.label && <span>{o.label}</span>}
          <input
            ref={input}
            value={value}
            placeholder={o.placeholder}
            maxLength={o.maxLength}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="dialog-actions">
          <button type="button" onClick={cancel}>
            Anuluj
          </button>
          <button type="submit" className="primary">
            {o.confirmLabel ?? 'Zapisz'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
