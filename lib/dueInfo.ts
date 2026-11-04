import { appLocale } from './format';
import type { BadgeTone } from '../src/components/ui/Badge';

type T = (key: string, opts?: Record<string, unknown>) => string;

export type DueInfo = { text: string; tone: BadgeTone; late: boolean };

/**
 * Relative due-date text and the badge tone to show it in:
 * late = danger, today/tomorrow = warning, later = neutral.
 * `t` must resolve keys from the `dashboard` namespace (pass `t` from useTranslation('dashboard')).
 */
export function getDueInfo(deliveryDate: string | null, status: string, t: T): DueInfo {
  if (!deliveryDate) return { text: '', tone: 'neutral', late: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(deliveryDate.slice(0, 10) + 'T00:00:00');
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      text: t('dayLate', { count: daysLate, defaultValue: `${daysLate} day${daysLate > 1 ? 's' : ''} late` }),
      // A ready order that is past due still needs handing over, but nothing is left to make.
      tone: status === 'ready' ? 'warning' : 'danger',
      late: true,
    };
  }
  if (diffDays === 0) return { text: t('dueTodayLabel', { defaultValue: 'Due today' }), tone: 'warning', late: false };
  if (diffDays === 1) return { text: t('dueTomorrowLabel', { defaultValue: 'Due tomorrow' }), tone: 'warning', late: false };
  const date = due.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short' });
  return { text: t('dueOnLabel', { date, defaultValue: `Due ${date}` }), tone: 'neutral', late: false };
}
