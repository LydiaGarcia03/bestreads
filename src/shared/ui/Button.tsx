import type { ButtonHTMLAttributes, Ref } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const BASE =
  'inline-flex h-11 items-center justify-center gap-2.5 rounded-md px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface text-fg hover:border-accent',
  /** Destructive actions (text color follows `on-accent`, which contrasts with `danger` in both themes). */
  danger: 'bg-danger text-on-accent hover:opacity-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** React 19 passes `ref` as a regular prop (e.g. to return focus to the button). */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
