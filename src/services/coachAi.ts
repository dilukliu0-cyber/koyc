/**
 * Offline-first heuristic coach. Always works without network.
 * Optional Gemini when EXPO_PUBLIC_GEMINI_API_KEY is set.
 */
import {
  DailyPlan,
  DailyTask,
  DifficultyLevel,
  Goal,
  GoalKind,
  PlanPhase,
  TimeframeWeeks,
  UserProfile,
} from '@/src/types';
import { addDaysKey, dayIndexFromStart, endDateFromWeeks, todayKey } from '@/src/utils/dates';
import { scoreToLevel } from '@/src/services/difficulty';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || '';

export function isGeminiConfigured(): boolean {
  return GEMINI_KEY.length > 0;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function detectDomain(text: string): string {
  const t = text.toLowerCase();
  if (/язык|english|английск|испан|немец|француз|japanese|япон|китай|speak|говор/.test(t))
    return 'language';
  if (/спорт|бег|зарядк|фитнес|вес|похуд|мышц|йог|тренир/.test(t)) return 'fitness';
  if (/код|программ|javascript|python|react|разработ|it |айти/.test(t)) return 'coding';
  if (/медитац|стресс|тревог|сон|привычк|утро|дисциплин/.test(t)) return 'habits';
  if (/бизнес|стартап|продаж|клиент|маркетинг|деньг/.test(t)) return 'business';
  if (/рисов|музык|гитар|творч|писат|блог/.test(t)) return 'creative';
  return 'general';
}

const DOMAIN_LABELS_RU: Record<string, string> = {
  language: 'изучение языка',
  fitness: 'спорт и тело',
  coding: 'программирование',
  habits: 'привычки и саморазвитие',
  business: 'бизнес и карьера',
  creative: 'творчество',
  general: 'личная цель',
};

type TaskTemplate = { title: string; description: string; minutes: number };

const TASK_BANK: Record<string, Record<DifficultyLevel, TaskTemplate[]>> = {
  language: {
    1: [
      { title: 'Карточки: 8 новых слов', description: 'Выучите 8 слов и повторите их вслух.', minutes: 10 },
      { title: 'Слушание 5 минут', description: 'Подкаст или видео на целевом языке без субтитров сначала.', minutes: 5 },
      { title: 'Одно предложение о дне', description: 'Напишите 1–2 предложения о сегодняшнем дне.', minutes: 8 },
    ],
    2: [
      { title: 'Карточки: 15 слов + примеры', description: '15 слов и по одному примеру к каждому.', minutes: 15 },
      { title: 'Диалог вслух 10 мин', description: 'Прочитайте диалог вслух, меняя интонацию.', minutes: 10 },
      { title: 'Мини-текст', description: 'Напишите короткий абзац (40–60 слов) по теме цели.', minutes: 15 },
    ],
    3: [
      { title: 'Грамматика: одно правило', description: 'Разберите одно правило и сделайте 8 упражнений.', minutes: 20 },
      { title: 'Теневое повторение', description: 'Shadowing: повторяйте за носителем 12 минут.', minutes: 12 },
      { title: 'Активный словарь', description: 'Составьте 10 фраз, которые реально пригодятся вам.', minutes: 18 },
    ],
    4: [
      { title: 'Свободная речь 15 мин', description: 'Говорите без подготовки на тему цели. Запишите себя.', minutes: 15 },
      { title: 'Статья + конспект', description: 'Прочитайте текст и выпишите 5 ключевых идей.', minutes: 25 },
      { title: 'Письмо другу', description: 'Напишите письмо/сообщение на 120+ слов.', minutes: 20 },
    ],
    5: [
      { title: 'Имитация интервью', description: 'Ответьте на 8 сложных вопросов вслух по теме цели.', minutes: 25 },
      { title: 'Глубокий разбор ошибки', description: 'Найдите 5 типичных ошибок и исправьте свои тексты.', minutes: 30 },
      { title: 'Проект-день', description: 'Сделайте мини-проект: презентация или рассказ 3–5 минут.', minutes: 40 },
    ],
  },
  fitness: {
    1: [
      { title: 'Прогулка 15 минут', description: 'Лёгкая прогулка в комфортном темпе.', minutes: 15 },
      { title: 'Разминка суставов', description: '5–7 минут мобильности: шея, плечи, бёдра.', minutes: 7 },
      { title: 'Вода и осанка', description: 'Выпейте воду и сделайте 3 подхода «от стены».', minutes: 5 },
    ],
    2: [
      { title: 'Кардио 20 минут', description: 'Быстрая ходьба, велосипед или лёгкий бег.', minutes: 20 },
      { title: 'Сила: корпус', description: 'Планка 3×20 сек + 2×10 приседаний.', minutes: 15 },
      { title: 'Растяжка после дня', description: 'Мягкая растяжка 10 минут перед сном.', minutes: 10 },
    ],
    3: [
      { title: 'Тренировка 30 минут', description: 'Круговая: приседания, отжимания, выпады, планка.', minutes: 30 },
      { title: 'Интервалы', description: '8 раундов: 40 сек работа / 20 сек отдых.', minutes: 12 },
      { title: 'Восстановление', description: 'Пена/массаж или йога-поток 15 минут.', minutes: 15 },
    ],
    4: [
      { title: 'Силовая сессия', description: '4 упражнения × 4 подхода с прогрессией.', minutes: 40 },
      { title: 'Длинное кардио', description: '35–40 минут устойчивого темпа.', minutes: 40 },
      { title: 'Техника движения', description: 'Разберите форму одного сложного упражнения.', minutes: 20 },
    ],
    5: [
      { title: 'Пиковая тренировка', description: 'Интенсивная сессия 45–50 минут по плану.', minutes: 50 },
      { title: 'Тест прогресса', description: 'Замерьте показатели (дистанция/повторы/время).', minutes: 30 },
      { title: 'Активное восстановление+', description: 'Мобильность + дыхание + короткая прогулка.', minutes: 25 },
    ],
  },
  coding: {
    1: [
      { title: 'Теория 15 минут', description: 'Прочитайте/посмотрите один короткий урок по теме.', minutes: 15 },
      { title: 'Мини-задача', description: 'Решите одну простую задачу (ката / упражнение).', minutes: 20 },
      { title: 'Заметки', description: 'Запишите 3 пункта «что узнал сегодня».', minutes: 8 },
    ],
    2: [
      { title: 'Практика: функция', description: 'Напишите небольшую функцию и тесты к ней.', minutes: 25 },
      { title: 'Чтение кода', description: 'Разберите чужой пример и объясните его своими словами.', minutes: 20 },
      { title: 'Рефакторинг', description: 'Улучшите вчерашний код: имена, структура.', minutes: 20 },
    ],
    3: [
      { title: 'Фича дня', description: 'Сделайте небольшой кусок функционала под цель.', minutes: 40 },
      { title: 'Отладка', description: 'Намеренно сломайте и почините баг — зафиксируйте шаги.', minutes: 25 },
      { title: 'Документация', description: 'Напишите README/комментарии к своему решению.', minutes: 15 },
    ],
    4: [
      { title: 'Архитектура', description: 'Спроектируйте модуль: входы, выходы, ошибки.', minutes: 35 },
      { title: 'Сложная задача', description: 'Решите задачу среднего/высокого уровня без подсказок сначала.', minutes: 45 },
      { title: 'Code review себя', description: 'Найдите 5 улучшений в своём коде за неделю.', minutes: 25 },
    ],
    5: [
      { title: 'Мини-проект спринт', description: 'Соберите end-to-end кусок проекта за сессию.', minutes: 60 },
      { title: 'Производительность', description: 'Измерьте и оптимизируйте узкое место.', minutes: 40 },
      { title: 'Обучение других', description: 'Напишите туториал или объяснение для новичка.', minutes: 35 },
    ],
  },
  habits: {
    1: [
      { title: 'Микро-привычка', description: 'Сделайте целевое действие 2 минуты без идеала.', minutes: 2 },
      { title: 'Дыхание 4–6', description: '5 циклов спокойного дыхания.', minutes: 5 },
      { title: 'Вечерний чек-ин', description: 'Оцените день 1–10 и одну причину оценки.', minutes: 5 },
    ],
    2: [
      { title: 'Утренний якорь', description: 'Ритуал 10 минут: вода, свет, короткое намерение.', minutes: 10 },
      { title: 'Блок фокуса', description: '25 минут без отвлечений на главную задачу.', minutes: 25 },
      { title: 'Цифровой детокс', description: '30 минут без соцсетей перед сном.', minutes: 30 },
    ],
    3: [
      { title: 'Привычка ×3', description: 'Повторите целевую привычку в трёх контекстах дня.', minutes: 20 },
      { title: 'Рефлексия', description: 'Напишите, что мешает и один эксперимент на завтра.', minutes: 15 },
      { title: 'Сон-гигиена', description: 'Подготовьте сон: свет, экран, время отхода.', minutes: 20 },
    ],
    4: [
      { title: 'Глубокая работа', description: 'Два блока по 25 минут с коротким перерывом.', minutes: 55 },
      { title: 'Триггеры среды', description: 'Измените окружение так, чтобы привычка стала проще.', minutes: 25 },
      { title: 'Социальный якорь', description: 'Расскажите о прогрессе другу или запишите голосовое.', minutes: 10 },
    ],
    5: [
      { title: 'День системы', description: 'Пересмотрите систему: триггер → действие → награда.', minutes: 40 },
      { title: 'Стресс-тест', description: 'Выполните привычку в неудобных условиях.', minutes: 30 },
      { title: 'Недельный разбор', description: 'Проанализируйте неделю и скорректируйте план.', minutes: 35 },
    ],
  },
  business: {
    1: [
      { title: 'Одна идея ценности', description: 'Сформулируйте, кому и какую боль решаете.', minutes: 15 },
      { title: 'Исследование 10 мин', description: 'Изучите одного конкурента или клиента.', minutes: 10 },
      { title: 'Список контактов', description: 'Добавьте 3 потенциальных контакта/лида.', minutes: 10 },
    ],
    2: [
      { title: 'Оффер дня', description: 'Напишите короткий оффер в 3–5 предложениях.', minutes: 20 },
      { title: 'Outreach', description: 'Отправьте 2 вежливых сообщения потенциальным клиентам.', minutes: 20 },
      { title: 'Метрики', description: 'Зафиксируйте 3 ключевые метрики прогресса.', minutes: 15 },
    ],
    3: [
      { title: 'Прототип/страница', description: 'Сделайте черновик лендинга или презентации.', minutes: 40 },
      { title: 'Интервью', description: 'Подготовьте и проведите (или отрепетируйте) 5 вопросов клиенту.', minutes: 30 },
      { title: 'Ценообразование', description: 'Проверьте цену и аргументы ценности.', minutes: 20 },
    ],
    4: [
      { title: 'Продажи: скрипт', description: 'Напишите скрипт звонка/встречи и отрепетируйте.', minutes: 35 },
      { title: 'Воронка', description: 'Опишите шаги от интереса до оплаты.', minutes: 30 },
      { title: 'Контент', description: 'Опубликуйте или подготовьте один полезный пост.', minutes: 30 },
    ],
    5: [
      { title: 'Спринт запуска', description: 'Сделайте самый важный шаг к запуску/сделке.', minutes: 50 },
      { title: 'Разбор отказа', description: 'Разберите один отказ и улучшите подход.', minutes: 30 },
      { title: 'План недели', description: 'Соберите план на 7 дней с приоритетами.', minutes: 25 },
    ],
  },
  creative: {
    1: [
      { title: 'Эскиз / набросок', description: '10 минут свободного творчества без критики.', minutes: 10 },
      { title: 'Вдохновение', description: 'Изучите одну работу, которая нравится, и выпишите приёмы.', minutes: 15 },
      { title: 'Мини-этюд', description: 'Сделайте маленький законченный фрагмент.', minutes: 15 },
    ],
    2: [
      { title: 'Практика техники', description: 'Потренируйте один приём 20 минут.', minutes: 20 },
      { title: 'Серия из 3', description: 'Сделайте три вариации одной идеи.', minutes: 25 },
      { title: 'Обратная связь себе', description: 'Что улучшить? 5 конкретных правок.', minutes: 10 },
    ],
    3: [
      { title: 'Работа над проектом', description: 'Продвиньте основной проект на заметный шаг.', minutes: 40 },
      { title: 'Композиция', description: 'Пересоберите структуру/композицию заново.', minutes: 30 },
      { title: 'Черновик публикации', description: 'Подготовьте черновик к показу работы.', minutes: 20 },
    ],
    4: [
      { title: 'Глубокая сессия', description: '50 минут фокуса на сложной части проекта.', minutes: 50 },
      { title: 'Критика мастеров', description: 'Сравните с референсами и улучшите 3 места.', minutes: 30 },
      { title: 'Финиш детали', description: 'Доведите деталь до «готово к показу».', minutes: 35 },
    ],
    5: [
      { title: 'Релиз / показ', description: 'Завершите и покажите работу (хотя бы одному человеку).', minutes: 45 },
      { title: 'Портфолио', description: 'Оформите описание и контекст работы.', minutes: 35 },
      { title: 'Новый уровень', description: 'Попробуйте приём выше текущего уровня.', minutes: 40 },
    ],
  },
  general: {
    1: [
      { title: 'Маленький шаг', description: 'Сделайте самое простое действие к цели (5–10 мин).', minutes: 10 },
      { title: 'Ясность', description: 'Запишите, что значит «прогресс» на этой неделе.', minutes: 10 },
      { title: 'Подготовка среды', description: 'Уберите одно препятствие к действию.', minutes: 10 },
    ],
    2: [
      { title: 'Основное действие', description: '25 минут целенаправленной работы по цели.', minutes: 25 },
      { title: 'Учёба', description: 'Изучите один ресурс, связанный с целью.', minutes: 20 },
      { title: 'Рефлексия', description: 'Что сработало? Что изменить завтра?', minutes: 10 },
    ],
    3: [
      { title: 'Глубокий блок', description: '40 минут работы без отвлечений.', minutes: 40 },
      { title: 'Практика навыка', description: 'Повторите ключевой навык с обратной связью себе.', minutes: 25 },
      { title: 'План на завтра', description: 'Составьте 3 приоритета на следующий день.', minutes: 10 },
    ],
    4: [
      { title: 'Сложный кусок', description: 'Возьмитесь за самую неприятную, но важную часть.', minutes: 45 },
      { title: 'Измерение прогресса', description: 'Соберите доказательства прогресса (цифры/артефакты).', minutes: 25 },
      { title: 'Обратная связь', description: 'Попросите или смоделируйте внешнюю оценку.', minutes: 20 },
    ],
    5: [
      { title: 'День рывка', description: 'Интенсивная сессия 60 минут к ключевому milestone.', minutes: 60 },
      { title: 'Системный обзор', description: 'Пересмотрите план и уберите лишнее.', minutes: 30 },
      { title: 'Публичный коммитмент', description: 'Зафиксируйте обязательство и срок.', minutes: 20 },
    ],
  },
};

const THEMES_BY_PHASE = [
  'Старт и привыкание',
  'Закрепление базы',
  'Ускорение',
  'Углубление',
  'Стабильность',
  'Пик и интеграция',
];

function buildPhases(weeks: TimeframeWeeks, domain: string, kind: GoalKind): PlanPhase[] {
  const phaseCount = weeks <= 2 ? 2 : weeks <= 4 ? 3 : weeks <= 8 ? 4 : 5;
  const size = Math.ceil(weeks / phaseCount);
  const phases: PlanPhase[] = [];
  for (let i = 0; i < phaseCount; i++) {
    const weekStart = i * size + 1;
    const weekEnd = Math.min(weeks, (i + 1) * size);
    const theme = THEMES_BY_PHASE[Math.min(i, THEMES_BY_PHASE.length - 1)];
    const verb = kind === 'learn' ? 'освоить' : 'изменить';
    phases.push({
      title: `Фаза ${i + 1}: ${theme}`,
      description: `Сфокусируйтесь на том, чтобы ${verb} ключевые элементы (${DOMAIN_LABELS_RU[domain]}). Недели ${weekStart}–${weekEnd}.`,
      weekStart,
      weekEnd,
    });
  }
  return phases;
}

function pickTasks(
  domain: string,
  level: DifficultyLevel,
  dayIndex: number,
  count: number
): DailyTask[] {
  const bank = TASK_BANK[domain] ?? TASK_BANK.general;
  const pool = bank[level] ?? bank[3];
  const tasks: DailyTask[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = pool[(dayIndex + i) % pool.length];
    tasks.push({
      id: uid('task'),
      title: tpl.title,
      description: tpl.description,
      estimatedMinutes: Math.round(tpl.minutes * (0.85 + level * 0.05)),
      difficulty: level,
      completed: false,
    });
  }
  return tasks;
}

function taskCountForLevel(level: DifficultyLevel): number {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  return 3;
}

export function heuristicAnalyze(
  profile: UserProfile,
  goalTitle: string,
  kind: GoalKind,
  timeframeWeeks: TimeframeWeeks
): { summary: string; phases: PlanPhase[]; domain: string } {
  const combined = `${profile.aboutMe} ${goalTitle}`;
  const domain = detectDomain(combined);
  const phases = buildPhases(timeframeWeeks, domain, kind);
  const kindLabel = kind === 'learn' ? 'научиться' : 'изменить привычку/поведение';
  const summary = [
    `Я вижу вашу цель: ${kindLabel} — «${goalTitle.trim()}».`,
    `Контекст: ${profile.aboutMe.trim().slice(0, 180)}${profile.aboutMe.length > 180 ? '…' : ''}`,
    `Направление: ${DOMAIN_LABELS_RU[domain]}. Срок: ${timeframeWeeks} нед.`,
    `План разбит на ${phases.length} фазы: от мягкого старта к устойчивому прогрессу.`,
    `Сложность будет адаптироваться: после успехов — чуть сложнее, после пропусков — легче.`,
  ].join('\n\n');
  return { summary, phases, domain };
}

export async function analyzeAndCreateGoal(input: {
  profile: UserProfile;
  goalTitle: string;
  kind: GoalKind;
  timeframeWeeks: TimeframeWeeks;
}): Promise<{ goal: Goal; domain: string }> {
  const start = todayKey();
  const end = endDateFromWeeks(start, input.timeframeWeeks);

  let summary: string;
  let phases: PlanPhase[];
  let domain: string;

  if (isGeminiConfigured()) {
    try {
      const gemini = await callGeminiAnalysis(input);
      summary = gemini.summary;
      phases = gemini.phases.length ? gemini.phases : buildPhases(input.timeframeWeeks, gemini.domain, input.kind);
      domain = gemini.domain;
    } catch {
      const h = heuristicAnalyze(input.profile, input.goalTitle, input.kind, input.timeframeWeeks);
      summary = h.summary + '\n\n(Gemini недоступен — использован офлайн-коуч.)';
      phases = h.phases;
      domain = h.domain;
    }
  } else {
    const h = heuristicAnalyze(input.profile, input.goalTitle, input.kind, input.timeframeWeeks);
    summary = h.summary;
    phases = h.phases;
    domain = h.domain;
  }

  const goal: Goal = {
    id: uid('goal'),
    kind: input.kind,
    title: input.goalTitle.trim(),
    description: input.profile.aboutMe.trim(),
    timeframeWeeks: input.timeframeWeeks,
    startDate: start,
    endDate: end,
    analysisSummary: summary,
    planPhases: phases,
    difficultyScore: 2.5,
  };

  return { goal, domain };
}

export function generateDailyPlan(opts: {
  goal: Goal;
  date: string;
  difficultyScore: number;
  domainHint?: string;
}): DailyPlan {
  const domain = opts.domainHint ?? detectDomain(`${opts.goal.title} ${opts.goal.description}`);
  const level = scoreToLevel(opts.difficultyScore);
  const dayIndex = Math.max(0, dayIndexFromStart(opts.goal.startDate, opts.date));
  const totalDays = dayIndexFromStart(opts.goal.startDate, opts.goal.endDate) + 1;
  const week = Math.floor(dayIndex / 7) + 1;
  const phase =
    opts.goal.planPhases.find((p) => week >= p.weekStart && week <= p.weekEnd) ??
    opts.goal.planPhases[0];

  const count = taskCountForLevel(level);
  const tasks = pickTasks(domain, level, dayIndex, count);

  const progressPct = totalDays > 0 ? Math.round(((dayIndex + 1) / totalDays) * 100) : 0;
  const coachNotes = [
    `День ${dayIndex + 1} из ${totalDays}. Неделя ${week}.`,
    phase ? `Фаза: ${phase.title}.` : '',
    level <= 2
      ? 'Сегодня мягкий день — важнее стабильность, чем идеал.'
      : level >= 4
        ? 'День с вызовом. Разбейте задачи на куски, если тяжело.'
        : 'Баланс нагрузки нормальный. Фокус на качестве выполнения.',
    `Прогресс по сроку ≈ ${progressPct}%.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    date: opts.date,
    dayIndex,
    theme: phase?.title ?? `День ${dayIndex + 1}`,
    coachNote: coachNotes,
    tasks,
    difficultyUsed: level,
  };
}

export function ensurePlansForRange(
  goal: Goal,
  plans: Record<string, DailyPlan>,
  difficultyScore: number,
  fromDate: string,
  days: number
): Record<string, DailyPlan> {
  const next = { ...plans };
  const domain = detectDomain(`${goal.title} ${goal.description}`);
  for (let i = 0; i < days; i++) {
    const date = addDaysKey(fromDate, i);
    if (date > goal.endDate) break;
    if (date < goal.startDate) continue;
    if (!next[date]) {
      next[date] = generateDailyPlan({ goal, date, difficultyScore, domainHint: domain });
    }
  }
  return next;
}

/** Regenerate future (incomplete) days when difficulty changes. */
export function adaptUpcomingPlans(
  goal: Goal,
  plans: Record<string, DailyPlan>,
  difficultyScore: number,
  fromDateExclusive: string,
  horizonDays = 7
): Record<string, DailyPlan> {
  const next = { ...plans };
  const domain = detectDomain(`${goal.title} ${goal.description}`);
  for (let i = 1; i <= horizonDays; i++) {
    const date = addDaysKey(fromDateExclusive, i);
    if (date > goal.endDate) break;
    const existing = next[date];
    if (existing && existing.tasks.some((t) => t.completed)) continue;
    next[date] = generateDailyPlan({ goal, date, difficultyScore, domainHint: domain });
  }
  return next;
}

async function callGeminiAnalysis(input: {
  profile: UserProfile;
  goalTitle: string;
  kind: GoalKind;
  timeframeWeeks: TimeframeWeeks;
}): Promise<{ summary: string; phases: PlanPhase[]; domain: string }> {
  const fallback = heuristicAnalyze(input.profile, input.goalTitle, input.kind, input.timeframeWeeks);
  const prompt = `Ты персональный коуч. Ответь СТРОГО JSON без markdown:
{"summary":"2-4 абзаца на русском","domain":"language|fitness|coding|habits|business|creative|general","phases":[{"title":"...","description":"...","weekStart":1,"weekEnd":2}]}
О себе: ${input.profile.aboutMe}
Цель (${input.kind}): ${input.goalTitle}
Срок: ${input.timeframeWeeks} недель.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallback;
  const parsed = JSON.parse(jsonMatch[0]) as {
    summary?: string;
    domain?: string;
    phases?: PlanPhase[];
  };
  return {
    summary: parsed.summary || fallback.summary,
    domain: parsed.domain || fallback.domain,
    phases: Array.isArray(parsed.phases) && parsed.phases.length ? parsed.phases : fallback.phases,
  };
}
