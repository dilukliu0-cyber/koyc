import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Body,
  Card,
  Muted,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { colors, spacing } from '@/src/theme/colors';
import { formatRuDate } from '@/src/utils/dates';
import { isGeminiConfigured } from '@/src/services/coachAi';

export default function AnalysisScreen() {
  const router = useRouter();
  const { state } = useCoach();
  const goal = state.goal;

  if (!goal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Screen>
          <Title>Нет данных</Title>
          <Subtitle style={{ marginTop: spacing.md }}>Сначала пройдите онбординг.</Subtitle>
          <PrimaryButton label="Начать" onPress={() => router.replace('/')} />
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Muted>Шаг 3 из 3</Muted>
          <Title style={{ marginTop: spacing.sm }}>Ваш план готов</Title>
          <Subtitle style={{ marginTop: spacing.sm }}>
            {goal.title} · до {formatRuDate(goal.endDate)}
          </Subtitle>
          <Muted style={{ marginTop: spacing.sm }}>
            {isGeminiConfigured() ? 'Режим: Gemini + эвристики' : 'Режим: офлайн-коуч (эвристики)'}
          </Muted>

          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {goal.analysisSummary.split("\n").filter(Boolean).map((para, i) => (
              <Body key={i}>{para}</Body>
            ))}
          </Card>

          <Title style={{ fontSize: 20, marginTop: spacing.lg, marginBottom: spacing.sm }}>
            Фазы
          </Title>
          {goal.planPhases.map((phase) => (
            <Card key={phase.title} style={{ marginBottom: spacing.sm }}>
              <Body style={{ fontWeight: '700' }}>{phase.title}</Body>
              <Muted style={{ marginTop: 4 }}>
                Недели {phase.weekStart}–{phase.weekEnd}
              </Muted>
              <Body style={{ marginTop: spacing.sm, color: colors.textSecondary }}>
                {phase.description}
              </Body>
            </Card>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label="К сегодняшним задачам" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
