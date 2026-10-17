import { useEffect, useRef, type ReactNode } from 'react';

/** Stos otwartych okien – Escape zamyka tylko najwyższe (np. potwierdzenie nad panelem uczestników). */
const stack: object[] = [];

export function Modal({
  title,
  onClose,
  children,
  wide,
  className,
}: {
  title: string;
  onClose(): void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const token = useRef({}).current;
  useEffect(() => {
    stack.push(token);
    return () => {
      const i = stack.lastIndexOf(token);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [token]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === token) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, token]);

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal card${wide ? ' wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
