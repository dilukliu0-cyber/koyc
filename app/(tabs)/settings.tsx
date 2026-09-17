import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Body,
  Card,
  Muted,
  PrimaryButton,
  Screen,
  Title,
} from '@/src/components/ui';
import { useCoach } from '@/src/context/CoachContext';
import { isGeminiConfigured } from '@/src/services/coachAi';
import { colors, spacing } from '@/src/theme/colors';

export default function SettingsScreen() {
  const { state, resetAll, refreshToday } = useCoach();
  const router = useRouter();

  const onReset = () => {
    Alert.alert(
      'Сбросить всё?',
      'Профиль, цель, задачи и прогресс будут удалены с устройства.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Title>Настройки</Title>

          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>Профиль</Body>
            <Muted>{state.profile?.aboutMe || '—'}</Muted>
          </Card>

          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>Цель</Body>
            <Body>{state.goal?.title || '—'}</Body>
            <Muted>
              Тип: {state.goal?.kind === 'learn' ? 'научиться' : 'изменить'} ·{' '}
              {state.goal?.timeframeWeeks} нед.
            </Muted>
          </Card>

          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Body style={{ fontWeight: '700' }}>AI-коуч</Body>
            <Muted>
              {isGeminiConfigured()
                ? 'Ключ Gemini найден (EXPO_PUBLIC_GEMINI_API_KEY). Анализ может использовать Gemini с откатом на эвристики.'
                : 'Ключ Gemini не задан. Работает офлайн-эвристический коуч — этого достаточно для MVP.'}
            </Muted>
            <Muted>Данные хранятся локально (AsyncStorage).</Muted>
          </Card>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <PrimaryButton label="Обновить план на ближайшие дни" onPress={() => refreshToday()} />
            <PrimaryButton label="Сбросить онбординг" variant="danger" onPress={onReset} />
          </View>

          <Muted style={{ marginTop: spacing.xl, textAlign: 'center' }}>Коуч · local-first MVP</Muted>
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
