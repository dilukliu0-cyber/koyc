import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Body,
  Card,
  Muted,
  ProgressBar,
  Screen,
  Title,
} from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { colors, spacing } from '@/src/theme/colors';
import { daysBetween, formatRuDate, todayKey } from '@/src/utils/dates';

export default function ProgressScreen() {
  const { state, stats } = useCoach();
  const goal = state.goal;
  if (!goal) return null;

  const today = todayKey();
  const totalSpan = Math.max(1, daysBetween(goal.startDate, goal.endDate) + 1);
  const elapsed = Math.min(totalSpan, Math.max(0, daysBetween(goal.startDate, today) + 1));
  const timeProgress = elapsed / totalSpan;

  const completedTasks = Object.values(state.plans).reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.completed).length,
    0
  );
  const totalTasks = Object.values(state.plans).reduce((sum, p) => sum + p.tasks.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Title>Прогресс</Title>
          <Muted style={{ marginTop: spacing.sm }}>{goal.title}</Muted>

          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>Срок</Body>
            <Muted>
              {formatRuDate(goal.startDate)} — {formatRuDate(goal.endDate)} ({goal.timeframeWeeks}{' '}
              нед.)
            </Muted>
            <ProgressBar value={timeProgress} />
            <Muted>
              День {elapsed} из {totalSpan}
            </Muted>
          </Card>

          <View style={styles.grid}>
            <StatCard label="Серия дней" value={String(stats.streak)} hint="с активностью" />
            <StatCard
              label="Идеальные дни"
              value={String(stats.perfectDays)}
              hint={`из ${stats.totalDays} чек-инов`}
            />
            <StatCard
              label="Средний %"
              value={`${Math.round(stats.avgRatio * 100)}%`}
              hint="выполнения"
            />
            <StatCard
              label="Сложность"
              value={state.difficultyScore.toFixed(1)}
              hint="адаптивный скор"
            />
          </View>

          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>Задачи</Body>
            <ProgressBar value={totalTasks ? completedTasks / totalTasks : 0} />
            <Muted>
              Выполнено {completedTasks} из {totalTasks} сгенерированных
            </Muted>
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Body style={{ fontWeight: '700', marginBottom: spacing.sm }}>Фазы плана</Body>
            {goal.planPhases.map((phase) => (
              <View key={phase.title} style={{ marginBottom: spacing.md }}>
                <Body>{phase.title}</Body>
                <Muted>
                  Недели {phase.weekStart}–{phase.weekEnd}
                </Muted>
                <Muted style={{ marginTop: 4 }}>{phase.description}</Muted>
              </View>
            ))}
          </Card>

          <Card style={{ marginTop: spacing.md, marginBottom: spacing.xxl }}>
            <Body style={{ fontWeight: '700', marginBottom: spacing.sm }}>Как работает адаптация</Body>
            <Muted>
              После дня с высоким процентом выполнения и оценкой «легко» сложность растёт — следующие
              дни получают более сложные задачи. Пропуски и «сложно» снижают нагрузку, чтобы вы не
              выгорали.
            </Muted>
          </Card>
        </ScrollView>
      </Screen>
    </SafeAreaView>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card style={styles.stat}>
      <Muted>{label}</Muted>
      <Title style={{ fontSize: 28, marginTop: 4 }}>{value}</Title>
      <Muted>{hint}</Muted>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stat: {
    width: '48%',
    flexGrow: 1,
  },
});
