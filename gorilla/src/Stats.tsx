import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CAN_LITERS,
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS,
  countsByDay,
  countsByMonth,
  dayKey,
  summarize,
} from './data';

const LIME = '#a8e02a';
const CARD = '#12171a';
const MUTED = '#7d8a8f';

type Tab = 'week' | 'month' | 'year' | 'all';
const TABS: [Tab, string][] = [
  ['week', 'Неделя'],
  ['month', 'Месяц'],
  ['year', 'Год'],
  ['all', 'Всё'],
];

function heat(n: number) {
  if (n <= 0) return '#161c1f';
  if (n === 1) return '#35560f';
  if (n === 2) return '#5f9a14';
  if (n === 3) return '#8fcf1f';
  return LIME;
}

function Bars({ labels, values, highlight }: { labels: string[]; values: number[]; highlight?: number }) {
  const max = Math.max(1, ...values);
  return (
    <View style={s.bars}>
      {values.map((v, i) => (
        <View key={i} style={s.barCol}>
          <Text style={s.barVal}>{v || ''}</Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { height: `${(v / max) * 100}%`, backgroundColor: i === highlight ? '#eaea2f' : LIME }]} />
          </View>
          <Text style={s.barLbl}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function Calendar({ byDay, year, month, onShift }: { byDay: Record<string, number>; year: number; month: number; onShift: (d: number) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const todayKey = dayKey(new Date());
  const monthTotal = Array.from({ length: days }, (_, i) => byDay[dayKey(new Date(year, month, i + 1))] ?? 0).reduce((a, b) => a + b, 0);
  const pickedCount = picked ? byDay[picked] ?? 0 : null;

  return (
    <View style={s.card}>
      <View style={s.calHead}>
        <Pressable onPress={() => onShift(-1)} hitSlop={12}><Text style={s.arrow}>‹</Text></Pressable>
        <Text style={s.calTitle}>{MONTHS[month]} {year}</Text>
        <Pressable onPress={() => onShift(1)} hitSlop={12}><Text style={s.arrow}>›</Text></Pressable>
      </View>
      <View style={s.weekRow}>
        {WEEKDAYS.map((d) => <Text key={d} style={s.weekday}>{d}</Text>)}
      </View>
      <View style={s.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={s.cell} />;
          const key = dayKey(new Date(year, month, d));
          const n = byDay[key] ?? 0;
          return (
            <Pressable key={i} style={s.cell} onPress={() => setPicked(key)}>
              <View style={[s.cellIn, { backgroundColor: heat(n) }, key === todayKey && s.today, key === picked && s.picked]}>
                <Text style={[s.cellTxt, n >= 3 && { color: '#07090a' }]}>{d}</Text>
                {n > 0 && <Text style={[s.cellCnt, n >= 3 && { color: '#07090a' }]}>{n}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.calFoot}>
        {pickedCount !== null ? `${picked!.split('-').reverse().join('.')}: ${pickedCount} шт.` : `За месяц: ${monthTotal} шт. · ${(monthTotal * CAN_LITERS).toFixed(1)} л`}
      </Text>
    </View>
  );
}

export default function Stats({ drinks, onBack }: { drinks: number[]; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('month');
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [year, setYear] = useState(now.getFullYear());

  const byDay = useMemo(() => countsByDay(drinks), [drinks]);
  const sum = useMemo(() => summarize(byDay), [byDay]);

  const shift = (d: number) => {
    const t = new Date(cursor.y, cursor.m + d, 1);
    setCursor({ y: t.getFullYear(), m: t.getMonth() });
  };

  // last 7 days
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: WEEKDAYS[(d.getDay() + 6) % 7], n: byDay[dayKey(d)] ?? 0 };
  });
  const weekTotal = week.reduce((a, b) => a + b.n, 0);

  const months = countsByMonth(byDay, year);
  const yearTotal = months.reduce((a, b) => a + b, 0);

  // all years
  const years = Array.from(new Set(Object.keys(byDay).map((k) => Number(k.slice(0, 4))))).sort();
  const perYear = years.map((y) => countsByMonth(byDay, y).reduce((a, b) => a + b, 0));

  const bestLabel = sum.best.count ? `${sum.best.key.split('-').reverse().join('.')} · ${sum.best.count}` : '—';

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Pressable onPress={onBack} hitSlop={12}><Text style={s.back}>‹ Назад</Text></Pressable>
        <Text style={s.title}>Статистика</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={s.kpis}>
          <Kpi label="Всего банок" value={String(sum.total)} />
          <Kpi label="Литров" value={(sum.total * CAN_LITERS).toFixed(1)} />
          <Kpi label="В среднем/день" value={sum.avgPerDay.toFixed(1)} />
          <Kpi label="Серия дней" value={String(sum.streak)} />
          <Kpi label="Рекорд дня" value={bestLabel} wide />
          <Kpi label="Активных дней" value={String(sum.activeDays)} wide />
        </View>

        <View style={s.tabs}>
          {TABS.map(([k, label]) => (
            <Pressable key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
              <Text style={[s.tabTxt, tab === k && { color: '#07090a' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'week' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Последние 7 дней · {weekTotal} шт.</Text>
            <Bars labels={week.map((w) => w.label)} values={week.map((w) => w.n)} highlight={6} />
          </View>
        )}

        {tab === 'month' && <Calendar byDay={byDay} year={cursor.y} month={cursor.m} onShift={shift} />}

        {tab === 'year' && (
          <View style={s.card}>
            <View style={s.calHead}>
              <Pressable onPress={() => setYear(year - 1)} hitSlop={12}><Text style={s.arrow}>‹</Text></Pressable>
              <Text style={s.calTitle}>{year} · {yearTotal} шт.</Text>
              <Pressable onPress={() => setYear(year + 1)} hitSlop={12}><Text style={s.arrow}>›</Text></Pressable>
            </View>
            <Bars labels={MONTHS_SHORT} values={months} highlight={year === now.getFullYear() ? now.getMonth() : undefined} />
            <Text style={s.calFoot}>{(yearTotal * CAN_LITERS).toFixed(1)} л за год</Text>
          </View>
        )}

        {tab === 'all' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>По годам</Text>
            {years.length === 0 ? (
              <Text style={s.calFoot}>Пока пусто — открой первую банку</Text>
            ) : (
              <Bars labels={years.map(String)} values={perYear} highlight={years.length - 1} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[s.kpi, wide && { width: '48.5%' }]}>
      <Text style={s.kpiVal}>{value}</Text>
      <Text style={s.kpiLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07090a' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  back: { color: LIME, fontSize: 17, width: 60 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, justifyContent: 'space-between' },
  kpi: { width: '23.5%', backgroundColor: CARD, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  kpiVal: { color: LIME, fontSize: 18, fontWeight: '900' },
  kpiLbl: { color: MUTED, fontSize: 10, marginTop: 4, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: LIME },
  tabTxt: { color: '#cfd8dc', fontWeight: '700' },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 14 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 170 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: '#161c1f', borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barVal: { color: '#fff', fontSize: 10, height: 14 },
  barLbl: { color: MUTED, fontSize: 9, marginTop: 4 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  arrow: { color: LIME, fontSize: 30, paddingHorizontal: 10, lineHeight: 32 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', color: MUTED, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cellIn: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cellTxt: { color: '#cfd8dc', fontSize: 12 },
  cellCnt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  today: { borderWidth: 1.5, borderColor: '#eaea2f' },
  picked: { borderWidth: 1.5, borderColor: '#fff' },
  calFoot: { color: MUTED, textAlign: 'center', marginTop: 12 },
});
