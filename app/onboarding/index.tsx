import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, Muted, PrimaryButton, Screen, Subtitle, Title } from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { colors, spacing } from '@/src/theme/colors';

export default function OnboardingAbout() {
  const router = useRouter();
  const { aboutDraft, setAboutDraft } = useCoach();
  const canContinue = aboutDraft.trim().length >= 20;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen style={styles.wrap}>
        <Muted>Шаг 1 из 3</Muted>
        <Title style={{ marginTop: spacing.sm }}>Расскажите о себе</Title>
        <Subtitle style={{ marginTop: spacing.sm }}>
          Чем занимаетесь, какой опыт, что уже пробовали, что мешает. Чем честнее — тем точнее план.
        </Subtitle>

        <View style={{ marginTop: spacing.lg, flex: 1 }}>
          <Field
            label="О себе"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 180 }}
            placeholder="Например: работаю в IT, хочу выучить испанский, раньше начинал и бросал через месяц из‑за нехватки времени…"
            value={aboutDraft}
            onChangeText={setAboutDraft}
          />
          <Muted style={{ marginTop: spacing.sm }}>Минимум 20 символов</Muted>
        </View>

        <PrimaryButton
          label="Далее"
          disabled={!canContinue}
          onPress={() => router.push('/onboarding/goal')}
        />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.xl,
  },
});
