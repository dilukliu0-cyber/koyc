import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useCoach } from '@/src/context/CoachContext';
import { Body, PrimaryButton, Screen, Subtitle, Title } from '@/src/components/ui';
import { colors, spacing } from '@/src/theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const { ready, state } = useCoach();
  const router = useRouter();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (state.onboarded && state.goal) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen style={styles.wrap}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Body style={{ color: colors.accentText, fontWeight: '600' }}>Коуч</Body>
          </View>
          <Title>Ваш персональный{'\n'}AI-коуч</Title>
          <Subtitle style={{ marginTop: spacing.md }}>
            Расскажите о себе и цели — получите план на каждый день, календарь прогресса и
            адаптивную сложность. Работает офлайн.
          </Subtitle>
        </View>

        <View style={styles.features}>
          <Feature text="Ежедневные задачи под вашу цель" />
          <Feature text="Календарь с отметками выполнения" />
          <Feature text="Сложность подстраивается под вас" />
        </View>

        <PrimaryButton label="Начать" onPress={() => router.push('/onboarding')} />
      </Screen>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.dot} />
      <Body>{text}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  hero: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  features: {
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
