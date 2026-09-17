import {
  CheckIn,
  DailyPlan,
  DifficultyLevel,
  TaskFeedback,
} from '@/src/types';

/** Clamp difficulty score to [1, 5]. */
export function clampDifficulty(score: number): number {
  return Math.min(5, Math.max(1, score));
}

export function scoreToLevel(score: number): DifficultyLevel {
  const rounded = Math.round(clampDifficulty(score));
  return Math.min(5, Math.max(1, rounded)) as DifficultyLevel;
}

/**
 * Update difficulty based on day completion ratio and optional feedback.
 * Success → harder; misses → easier.
 */
export function nextDifficultyScore(
  current: number,
  completedCount: number,
  totalCount: number,
  feedback?: TaskFeedback
): { score: number; delta: number } {
  if (totalCount <= 0) return { score: current, delta: 0 };

  const ratio = completedCount / totalCount;
  let delta = 0;

  if (ratio >= 1) delta += 0.35;
  else if (ratio >= 0.75) delta += 0.15;
  else if (ratio >= 0.5) delta -= 0.1;
  else if (ratio > 0) delta -= 0.25;
  else delta -= 0.4;

  if (feedback === 'easy') delta += 0.25;
  else if (feedback === 'hard') delta -= 0.3;
  else if (feedback === 'ok') delta += 0.05;

  const score = clampDifficulty(current + delta);
  return { score, delta: score - current };
}

export function summarizeCheckIns(checkIns: CheckIn[]) {
  const totalDays = checkIns.length;
  const perfectDays = checkIns.filter((c) => c.completedCount === c.totalCount && c.totalCount > 0).length;
  const missedDays = checkIns.filter((c) => c.completedCount === 0 && c.totalCount > 0).length;
  const avgRatio =
    totalDays === 0
      ? 0
      : checkIns.reduce((s, c) => s + (c.totalCount ? c.completedCount / c.totalCount : 0), 0) /
        totalDays;

  const streak = computeStreak(checkIns);
  return { totalDays, perfectDays, missedDays, avgRatio, streak };
}

function computeStreak(checkIns: CheckIn[]): number {
  if (!checkIns.length) return 0;
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const c of sorted) {
    if (c.completedCount > 0) streak += 1;
    else break;
  }
  return streak;
}

export function planCompletionRatio(plan: DailyPlan | undefined): number | null {
  if (!plan || plan.tasks.length === 0) return null;
  const done = plan.tasks.filter((t) => t.completed).length;
  return done / plan.tasks.length;
}
