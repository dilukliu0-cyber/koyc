import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DailyTask, TaskFeedback } from '@/src/types';
import { colors, radius, spacing } from '@/src/theme/colors';
import { Chip } from '@/src/components/ui';

export function TaskCard({
  task,
  onToggle,
  onFeedback,
  showFeedback,
}: {
  task: DailyTask;
  onToggle: () => void;
  onFeedback?: (f: TaskFeedback) => void;
  showFeedback?: boolean;
}) {
  return (
    <View style={[styles.card, task.completed && styles.cardDone]}>
      <Pressable onPress={onToggle} style={styles.row}>
        <View style={[styles.check, task.completed && styles.checkOn]}>
          {task.completed ? <Ionicons name="checkmark" size={16} color={colors.bg} /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, task.completed && styles.titleDone]}>{task.title}</Text>
          <Text style={styles.desc}>{task.description}</Text>
          <Text style={styles.meta}>
            ~{task.estimatedMinutes} мин · сложность {task.difficulty}/5
          </Text>
        </View>
      </Pressable>
      {showFeedback && task.completed && onFeedback ? (
        <View style={styles.feedbackRow}>
          <Text style={styles.feedbackLabel}>Как было?</Text>
          <Chip
            label="Легко"
            selected={task.feedback === 'easy'}
            color={colors.successSoft}
            onPress={() => onFeedback('easy')}
          />
          <Chip
            label="Норм"
            selected={task.feedback === 'ok'}
            color={colors.accentSoft}
            onPress={() => onFeedback('ok')}
          />
          <Chip
            label="Сложно"
            selected={task.feedback === 'hard'}
            color="#3A2220"
            onPress={() => onFeedback('hard')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardDone: {
    borderColor: colors.successSoft,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingTop: 4,
  },
  feedbackLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginRight: 4,
  },
});
