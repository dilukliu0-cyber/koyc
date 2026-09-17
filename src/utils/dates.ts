import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';

export function todayKey(d: Date = new Date()): string {
  return format(startOfDay(d), 'yyyy-MM-dd');
}

export function formatRuDate(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMMM yyyy', { locale: ru });
}

export function formatRuShort(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMM', { locale: ru });
}

export function formatRuWeekday(dateKey: string): string {
  return format(parseISO(dateKey), 'EEEE', { locale: ru });
}

export function addDaysKey(dateKey: string, days: number): string {
  return format(addDays(parseISO(dateKey), days), 'yyyy-MM-dd');
}

export function daysBetween(startKey: string, endKey: string): number {
  return differenceInCalendarDays(parseISO(endKey), parseISO(startKey));
}

export function dayIndexFromStart(startKey: string, dateKey: string): number {
  return differenceInCalendarDays(parseISO(dateKey), parseISO(startKey));
}

export function endDateFromWeeks(startKey: string, weeks: number): string {
  return addDaysKey(startKey, weeks * 7 - 1);
}

export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export const WEEKDAY_LABELS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
