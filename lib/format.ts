import i18n from './i18n';

/** Intl locale for dates in the current app language (digits stay 0-9). */
export function appLocale(): string {
  const lng = i18n.language;
  return lng === 'gu' ? 'gu-IN' : lng === 'hi' ? 'hi-IN' : 'en-IN';
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString(appLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString(appLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
