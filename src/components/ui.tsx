import { useEffect, useRef, type ReactNode } from 'react';
import type { Tone } from '../labels';

// Shared primitives. Keep these small: views compose them rather than configure them.

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  'aria-pressed': ariaPressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  'aria-pressed'?: boolean;
}) {
  return (
    <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled} aria-pressed={ariaPressed}>
      {children}
    </button>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <section className={`notice notice-${tone}`} aria-label={title ?? 'Notice'}>
      {title ? <p className="notice-title">{title}</p> : null}
      <div>{children}</div>
    </section>
  );
}

export function PageHeader({ id, title, lead }: { id: string; title: string; lead?: ReactNode }) {
  return (
    <header className="page-header">
      <p className="view-id">{id}</p>
      <h1 tabIndex={-1}>{title}</h1>
      {lead ? <div className="lead">{lead}</div> : null}
    </header>
  );
}

export function Simulated({ children }: { children: ReactNode }) {
  return <p className="simulated" role="note">Simulated. {children}</p>;
}

export function AccessDenied({ title }: { title: string }) {
  return (
    <section aria-labelledby="access-denied-title">
      <h2 id="access-denied-title">This view is not available in the current role</h2>
      <p>
        {title} is for a different role. Switch the persona in the demo controls to open it. Role
        switching is a demo control, not real security.
      </p>
    </section>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

/** Modal confirmation. Focus moves in, Tab stays inside, Escape cancels, and focus returns on close. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnFocus?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="dialog">
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
