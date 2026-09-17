export type GoalKind = 'learn' | 'change';

export type TimeframeWeeks = 2 | 4 | 8 | 12;

export type TaskFeedback = 'easy' | 'ok' | 'hard';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface UserProfile {
  aboutMe: string;
  name?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  title: string;
  description: string;
  timeframeWeeks: TimeframeWeeks;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  analysisSummary: string;
  planPhases: PlanPhase[];
  difficultyScore: number; // 1.0 .. 5.0
}

export interface PlanPhase {
  title: string;
  description: string;
  weekStart: number;
  weekEnd: number;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: DifficultyLevel;
  completed: boolean;
  feedback?: TaskFeedback;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  dayIndex: number;
  theme: string;
  coachNote: string;
  tasks: DailyTask[];
  difficultyUsed: DifficultyLevel;
  allCompleted?: boolean;
}

export interface CheckIn {
  date: string;
  completedCount: number;
  totalCount: number;
  feedback?: TaskFeedback;
  difficultyDelta: number;
}

export interface AppState {
  onboarded: boolean;
  profile: UserProfile | null;
  goal: Goal | null;
  plans: Record<string, DailyPlan>;
  checkIns: CheckIn[];
  difficultyScore: number;
}

export const DEFAULT_APP_STATE: AppState = {
  onboarded: false,
  profile: null,
  goal: null,
  plans: {},
  checkIns: [],
  difficultyScore: 2.5,
};
