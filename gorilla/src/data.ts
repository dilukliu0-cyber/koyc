import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@gorilla/drinks_v1';
export const CAN_LITERS = 0.45;

/** Every drink is a timestamp (ms). */
export async function loadDrinks(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export async function saveDrinks(drinks: number[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(drinks));
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function countsByDay(drinks: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of drinks) {
    const k = dayKey(new Date(t));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function countsByMonth(byDay: Record<string, number>, year: number): number[] {
  const out = new Array(12).fill(0);
  for (const [k, v] of Object.entries(byDay)) {
    const [y, m] = k.split('-').map(Number);
    if (y === year) out[m - 1] += v;
  }
  return out;
}

export function summarize(byDay: Record<string, number>) {
  const keys = Object.keys(byDay).sort();
  const total = keys.reduce((s, k) => s + byDay[k], 0);
  let best = { key: '', count: 0 };
  for (const k of keys) if (byDay[k] > best.count) best = { key: k, count: byDay[k] };
  let first: Date | null = null;
  if (keys.length) {
    const [y, m, d] = keys[0].split('-').map(Number);
    first = new Date(y, m - 1, d);
  }
  const days = first ? Math.max(1, Math.round((Date.now() - first.getTime()) / 86400000) + 1) : 1;
  // current streak of consecutive days with drinks (today may still be empty)
  let streak = 0;
  const cur = new Date();
  if (!byDay[dayKey(cur)]) cur.setDate(cur.getDate() - 1);
  while (byDay[dayKey(cur)]) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return { total, best, avgPerDay: total / days, activeDays: keys.length, streak };
}

export const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const MONTHS_SHORT = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
export const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
