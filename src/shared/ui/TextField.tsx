import { useId, type InputHTMLAttributes } from 'react';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Short help text, linked to the input for screen readers. */
  hint?: string;
}

/** Labeled text input with an optional hint. */
export function TextField({ label, hint, className = '', ...inputProps }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className="h-11 rounded-md border border-border-strong bg-surface px-3 text-fg lg:bg-bg outline-none placeholder:text-fg-muted focus:border-accent"
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
