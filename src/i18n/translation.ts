import { en } from './locales/en';
import { kr } from './locales/kr';
import { cn } from './locales/cn';

export const translations = {
  en,
  kr,
  cn,
};

export type Locale = keyof typeof translations;
