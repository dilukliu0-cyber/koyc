import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chip,
  Field,
  Muted,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
} from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { GoalKind, TimeframeWeeks } from '@/src/types';
import { colors, spacing } from '@/src/theme/colors';

const TIMEFRAMES: { weeks: TimeframeWeeks; label: string }[] = [
  { weeks: 2, label: '2 недели' },
  { weeks: 4, label: '4 недели' },
  { weeks: 8, label: '8 недель' },
  { weeks: 12, label: '12 недель' },
];

export default function OnboardingGoal() {
  const router = useRouter();
  const { aboutDraft, completeOnboarding, analyzing } = useCoach();
  const [kind, setKind] = useState<GoalKind>('learn');
  const [title, setTitle] = useState('');
  const [weeks, setWeeks] = useState<TimeframeWeeks>(4);
  const canContinue = title.trim().length >= 5 && aboutDraft.trim().length >= 20;

  const onSubmit = async () => {
    if (!canContinue || analyzing) return;
    await completeOnboarding({
      aboutMe: aboutDraft,
      goalTitle: title,
      kind,
      timeframeWeeks: weeks,
    });
    router.replace('/onboarding/analysis');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Muted>Шаг 2 из 3</Muted>
          <Title style={{ marginTop: spacing.sm }}>Цель и срок</Title>
          <Subtitle style={{ marginTop: spacing.sm }}>
            Что хотите изменить или чему научиться — и за какой срок.
          </Subtitle>

          <Muted style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Тип цели</Muted>
          <View style={styles.row}>
            <Chip label="Научиться" selected={kind === 'learn'} onPress={() => setKind('learn')} />
            <Chip label="Изменить" selected={kind === 'change'} onPress={() => setKind('change')} />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Field
              label="Формулировка цели"
              placeholder={
                kind === 'learn'
                  ? 'Например: уверенно говорить на английском B1'
                  : 'Например: бегать 3 раза в неделю без срывов'
              }
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <Muted style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Срок</Muted>
          <View style={styles.row}>
            {TIMEFRAMES.map((t) => (
              <Chip
                key={t.weeks}
                label={t.label}
                selected={weeks === t.weeks}
                onPress={() => setWeeks(t.weeks)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={analyzing ? 'Анализирую…' : 'Создать план'}
            loading={analyzing}
            disabled={!canContinue}
            onPress={onSubmit}
          />
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
