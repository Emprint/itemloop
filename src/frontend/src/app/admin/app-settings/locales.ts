export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'USD', name: 'US Dollar (USD)' },
  { code: 'GBP', name: 'British Pound (GBP)' },
  { code: 'CAD', name: 'Canadian Dollar (CAD)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];
