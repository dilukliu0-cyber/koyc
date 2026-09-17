import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppState,
  DailyPlan,
  DailyTask,
  GoalKind,
  TaskFeedback,
  TimeframeWeeks,
  UserProfile,
  DEFAULT_APP_STATE,
} from '@/src/types';
import { loadAppState, saveAppState, clearAppState } from '@/src/services/storage';
import {
  adaptUpcomingPlans,
  analyzeAndCreateGoal,
  ensurePlansForRange,
} from '@/src/services/coachAi';
import { nextDifficultyScore, summarizeCheckIns } from '@/src/services/difficulty';
import { todayKey } from '@/src/utils/dates';

interface CoachContextValue {
  ready: boolean;
  state: AppState;
  todayPlan: DailyPlan | null;
  stats: ReturnType<typeof summarizeCheckIns>;
  setAboutDraft: (about: string) => void;
  aboutDraft: string;
  completeOnboarding: (input: {
    aboutMe: string;
    goalTitle: string;
    kind: GoalKind;
    timeframeWeeks: TimeframeWeeks;
  }) => Promise<void>;
  toggleTask: (date: string, taskId: string) => Promise<void>;
  setTaskFeedback: (date: string, taskId: string, feedback: TaskFeedback) => Promise<void>;
  finalizeDayAdaptation: (date: string) => Promise<number>;
  resetAll: () => Promise<void>;
  refreshToday: () => Promise<void>;
  analyzing: boolean;
  analysisError: string | null;
}

const CoachContext = createContext<CoachContextValue | null>(null);

function majorityFeedback(tasks: DailyTask[]): TaskFeedback | undefined {
  const votes = tasks.map((t) => t.feedback).filter((f): f is TaskFeedback => !!f);
  if (!votes.length) return undefined;
  const counts: Record<TaskFeedback, number> = { easy: 0, ok: 0, hard: 0 };
  for (const v of votes) counts[v] += 1;
  return (Object.entries(counts) as [TaskFeedback, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>({
    ...DEFAULT_APP_STATE,
    plans: {},
    checkIns: [],
  });
  const [aboutDraft, setAboutDraft] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadAppState();
      if (cancelled) return;
      let next = loaded;
      if (loaded.goal && loaded.onboarded) {
        const today = todayKey();
        const plans = ensurePlansForRange(
          loaded.goal,
          loaded.plans,
          loaded.difficultyScore,
          today,
          14
        );
        next = { ...loaded, plans };
        await saveAppState(next);
      }
      setState(next);
      if (next.profile?.aboutMe) setAboutDraft(next.profile.aboutMe);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (updater: (prev: AppState) => AppState): Promise<AppState> => {
    let snapshot: AppState | undefined;
    setState((prev) => {
      const next = updater(prev);
      snapshot = next;
      return next;
    });
    if (!snapshot) {
      // Should not happen; fall back to reading current via functional noop
      snapshot = { ...DEFAULT_APP_STATE, plans: {}, checkIns: [] };
    }
    await saveAppState(snapshot);
    return snapshot;
  }, []);

  const completeOnboarding = useCallback(
    async (input: {
      aboutMe: string;
      goalTitle: string;
      kind: GoalKind;
      timeframeWeeks: TimeframeWeeks;
    }) => {
      setAnalyzing(true);
      setAnalysisError(null);
      try {
        const profile: UserProfile = {
          aboutMe: input.aboutMe.trim(),
          createdAt: new Date().toISOString(),
        };
        const { goal } = await analyzeAndCreateGoal({
          profile,
          goalTitle: input.goalTitle,
          kind: input.kind,
          timeframeWeeks: input.timeframeWeeks,
        });
        const difficultyScore = 2.5;
        const plans = ensurePlansForRange(goal, {}, difficultyScore, goal.startDate, 14);
        const next: AppState = {
          onboarded: true,
          profile,
          goal,
          plans,
          checkIns: [],
          difficultyScore,
        };
        setState(next);
        await saveAppState(next);
      } catch (e) {
        setAnalysisError(e instanceof Error ? e.message : 'Не удалось создать план');
        throw e;
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const toggleTask = useCallback(
    async (date: string, taskId: string) => {
      await persist((prev) => {
        const plan = prev.plans[date];
        if (!plan) return prev;
        const tasks: DailyTask[] = plan.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completed: !t.completed,
                feedback: !t.completed ? t.feedback : undefined,
              }
            : t
        );
        const allCompleted = tasks.length > 0 && tasks.every((t) => t.completed);
        return {
          ...prev,
          plans: {
            ...prev.plans,
            [date]: { ...plan, tasks, allCompleted },
          },
        };
      });
    },
    [persist]
  );

  const setTaskFeedback = useCallback(
    async (date: string, taskId: string, feedback: TaskFeedback) => {
      await persist((prev) => {
        const plan = prev.plans[date];
        if (!plan) return prev;
        const tasks = plan.tasks.map((t) => (t.id === taskId ? { ...t, feedback } : t));
        return {
          ...prev,
          plans: { ...prev.plans, [date]: { ...plan, tasks } },
        };
      });
    },
    [persist]
  );

  const finalizeDayAdaptation = useCallback(
    async (date: string) => {
      const next = await persist((prev) => {
        const plan = prev.plans[date];
        if (!plan || !prev.goal) return prev;
        const completedCount = plan.tasks.filter((t) => t.completed).length;
        const totalCount = plan.tasks.length;
        const feedback = majorityFeedback(plan.tasks);

        const { score, delta } = nextDifficultyScore(
          prev.difficultyScore,
          completedCount,
          totalCount,
          feedback
        );

        const checkIns = [
          ...prev.checkIns.filter((c) => c.date !== date),
          { date, completedCount, totalCount, feedback, difficultyDelta: delta },
        ].sort((a, b) => a.date.localeCompare(b.date));

        const plans = adaptUpcomingPlans(prev.goal, prev.plans, score, date, 7);

        return {
          ...prev,
          difficultyScore: score,
          checkIns,
          plans,
          goal: { ...prev.goal, difficultyScore: score },
        };
      });
      return next?.difficultyScore ?? state.difficultyScore;
    },
    [persist, state.difficultyScore]
  );

  const resetAll = useCallback(async () => {
    await clearAppState();
    setState({ ...DEFAULT_APP_STATE, plans: {}, checkIns: [] });
    setAboutDraft('');
  }, []);

  const refreshToday = useCallback(async () => {
    await persist((prev) => {
      if (!prev.goal) return prev;
      const today = todayKey();
      const plans = ensurePlansForRange(prev.goal, prev.plans, prev.difficultyScore, today, 14);
      return { ...prev, plans };
    });
  }, [persist]);

  const todayPlan = useMemo(() => {
    const today = todayKey();
    return state.plans[today] ?? null;
  }, [state.plans]);

  const stats = useMemo(() => summarizeCheckIns(state.checkIns), [state.checkIns]);

  const value: CoachContextValue = {
    ready,
    state,
    todayPlan,
    stats,
    aboutDraft,
    setAboutDraft,
    completeOnboarding,
    toggleTask,
    setTaskFeedback,
    finalizeDayAdaptation,
    resetAll,
    refreshToday,
    analyzing,
    analysisError,
  };

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach(): CoachContextValue {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error('useCoach must be used within CoachProvider');
  return ctx;
}
