import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '@/src/components/TaskCard';
import {
  Body,
  Card,
  Muted,
  PrimaryButton,
  ProgressBar,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { TaskFeedback } from '@/src/types';
import { colors, spacing } from '@/src/theme/colors';
import { formatRuDate, formatRuWeekday, todayKey } from '@/src/utils/dates';

export default function TodayScreen() {
  const {
    todayPlan,
    state,
    toggleTask,
    setTaskFeedback,
    finalizeDayAdaptation,
    refreshToday,
  } = useCoach();
  const [adapted, setAdapted] = useState(false);
  const today = todayKey();

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  useEffect(() => {
    const already = state.checkIns.some((c) => c.date === today);
    setAdapted(already);
  }, [state.checkIns, today]);

  const progress = useMemo(() => {
    if (!todayPlan || todayPlan.tasks.length === 0) return 0;
    return todayPlan.tasks.filter((t) => t.completed).length / todayPlan.tasks.length;
  }, [todayPlan]);

  const onFeedback = async (taskId: string, feedback: TaskFeedback) => {
    await setTaskFeedback(today, taskId, feedback);
  };

  const onAdapt = async () => {
    if (!todayPlan) return;
    const score = await finalizeDayAdaptation(today);
    setAdapted(true);
    Alert.alert(
      'Сложность обновлена',
      `Новый уровень ≈ ${score.toFixed(1)}. Ближайшие дни пересобраны.`
    );
  };

  if (!state.goal) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Muted style={{ textTransform: 'capitalize' }}>{formatRuWeekday(today)}</Muted>
          <Title style={{ marginTop: 4 }}>Сегодня</Title>
          <Subtitle style={{ marginTop: spacing.sm }}>{formatRuDate(today)}</Subtitle>

          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>{state.goal.title}</Body>
            <Muted>
              Сложность плана: {todayPlan?.difficultyUsed ?? '—'}/5 · общий скор{' '}
              {state.difficultyScore.toFixed(1)}
            </Muted>
            <ProgressBar value={progress} />
            <Muted>
              {todayPlan
                ? `${todayPlan.tasks.filter((t) => t.completed).length} из ${todayPlan.tasks.length} задач`
                : 'Задач пока нет'}
            </Muted>
          </Card>

          {todayPlan ? (
            <>
              <Card style={{ marginTop: spacing.md }}>
                <Muted>Заметка коуча</Muted>
                <Body style={{ marginTop: 6 }}>{todayPlan.coachNote}</Body>
                <Muted style={{ marginTop: 8 }}>Тема: {todayPlan.theme}</Muted>
              </Card>

              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                {todayPlan.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(today, task.id)}
                    showFeedback
                    onFeedback={(f) => onFeedback(task.id, f)}
                  />
                ))}
              </View>

              {!adapted && progress > 0 ? (
                <View style={{ marginTop: spacing.lg }}>
                  <PrimaryButton
                    label="Обновить сложность по сегодняшнему дню"
                    onPress={onAdapt}
                  />
                  <Muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                    Учитываются выполненные задачи и оценка «легко / норм / сложно»
                  </Muted>
                </View>
              ) : null}
              {adapted ? (
                <Muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>
                  Адаптация за сегодня уже применена
                </Muted>
              ) : null}
            </>
          ) : (
            <Card style={{ marginTop: spacing.lg }}>
              <Body>На сегодня задач нет. Потяните обновление или зайдите в настройки.</Body>
              <View style={{ marginTop: spacing.md }}>
                <PrimaryButton label="Сгенерировать" onPress={() => refreshToday()} />
              </View>
            </Card>
          )}
        </ScrollView>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
