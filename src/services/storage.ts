import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_APP_STATE } from '@/src/types';

const STORAGE_KEY = '@koyc/app_state_v1';

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_STATE, plans: {}, checkIns: [] };
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...DEFAULT_APP_STATE,
      ...parsed,
      plans: parsed.plans ?? {},
      checkIns: parsed.checkIns ?? [],
    };
  } catch {
    return { ...DEFAULT_APP_STATE, plans: {}, checkIns: [] };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearAppState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
