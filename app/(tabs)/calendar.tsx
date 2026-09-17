import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Body,
  Card,
  Muted,
  Screen,
  Title,
} from '@/src/components/ui';
import { TaskCard } from '@/src/components/TaskCard';
import { useCoach } from '@/src/context/CoachContext';
import { colors, radius, spacing } from '@/src/theme/colors';
import {
  WEEKDAY_LABELS_RU,
  formatRuDate,
  monthMatrix,
  todayKey,
} from '@/src/utils/dates';
import { planCompletionRatio } from '@/src/services/difficulty';

export default function CalendarScreen() {
  const { state, toggleTask } = useCoach();
  const today = todayKey();
  const initial = new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [selected, setSelected] = useState(today);

  const rows = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const selectedPlan = state.plans[selected];

  const cellColor = (dateKey: string | null) => {
    if (!dateKey) return 'transparent';
    const ratio = planCompletionRatio(state.plans[dateKey]);
    if (ratio === null) {
      if (state.goal && dateKey >= state.goal.startDate && dateKey <= state.goal.endDate) {
        return colors.calendarEmpty;
      }
      return 'transparent';
    }
    if (ratio >= 1) return colors.calendarDone;
    if (ratio > 0) return colors.warning;
    return colors.calendarMiss;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen>
        <Title>Календарь</Title>
        <Muted style={{ marginTop: spacing.sm }}>Отметки выполнения по дням</Muted>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Body style={{ fontWeight: '700', textTransform: 'capitalize' }}>{monthLabel}</Body>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAY_LABELS_RU.map((d) => (
              <Text key={d} style={styles.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          {rows.map((row, i) => (
            <View key={i} style={styles.weekRow}>
              {row.map((dateKey, j) => {
                const isSelected = dateKey === selected;
                const isToday = dateKey === today;
                const bg = cellColor(dateKey);
                return (
                  <Pressable
                    key={`${i}-${j}`}
                    style={[
                      styles.cell,
                      dateKey && { backgroundColor: bg === 'transparent' ? colors.bgElevated : bg },
                      isSelected && styles.cellSelected,
                      isToday && styles.cellToday,
                    ]}
                    disabled={!dateKey}
                    onPress={() => dateKey && setSelected(dateKey)}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        (bg === colors.calendarDone || bg === colors.calendarMiss) && {
                          color: colors.bg,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {dateKey ? Number(dateKey.slice(-2)) : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legend}>
            <Legend color={colors.calendarDone} label="Всё сделано" />
            <Legend color={colors.warning} label="Частично" />
            <Legend color={colors.calendarMiss} label="Пропуск" />
            <Legend color={colors.calendarEmpty} label="В плане" />
          </View>
        </Card>

        <Muted style={{ marginTop: spacing.lg }}>{formatRuDate(selected)}</Muted>
        {selectedPlan ? (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm, paddingBottom: spacing.xxl }}>
            {selectedPlan.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(selected, task.id)}
              />
            ))}
          </View>
        ) : (
          <Card style={{ marginTop: spacing.sm }}>
            <Body>На этот день задач нет.</Body>
          </Card>
        )}
      </Screen>
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Muted>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: colors.accentText,
  },
  cellText: {
    color: colors.text,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
