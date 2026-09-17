import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Body, Title } from '@/src/components/ui';
import { colors, spacing } from '@/src/theme/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Не найдено', headerShown: true }} />
      <View style={styles.container}>
        <Title>Экран не найден</Title>
        <Link href="/" style={{ marginTop: spacing.md }}>
          <Body style={{ color: colors.accent }}>На главную</Body>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
