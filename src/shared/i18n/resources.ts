import en from './locales/en.json';
import ptBRMessages from './locales/pt-BR.json';
import type { Language } from './languages';

export type Messages = typeof en;

// Typed as `Messages` so a key missing from pt-BR fails type checking.
const ptBR: Messages = ptBRMessages;

export const resources: Record<Language, { translation: Messages }> = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
};
