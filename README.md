# Коуч (koyc)

Персональный AI-коуч на Expo + React Native + TypeScript.

Personal AI coach MVP — local-first daily plans, calendar checkmarks, adaptive difficulty.

## Возможности / Features

- Онбординг: о себе → цель (научиться / изменить) → срок
- Анализ и план по фазам (офлайн-эвристики; опционально Gemini)
- Ежедневные задачи
- Календарь с отметками выполнения
- Адаптивная сложность по completion + feedback (легко / норм / сложно)
- Данные на устройстве (AsyncStorage)

## Запуск / Run

```bash
cd /workspace/koyc
npm install
cp .env.example .env   # опционально добавьте EXPO_PUBLIC_GEMINI_API_KEY
npm start              # Expo Dev Tools
npm run web            # веб
npm run android        # Android
npm run ios            # iOS (macOS)
```

Typecheck:

```bash
npm run typecheck
```

## Структура / Structure

```
app/                    # Expo Router screens
  index.tsx             # Welcome
  onboarding/           # about → goal → analysis
  (tabs)/               # Today, Calendar, Progress, Settings
src/
  services/coachAi.ts   # offline coach + optional Gemini
  services/storage.ts   # AsyncStorage
  services/difficulty.ts
  context/CoachContext.tsx
  components/           # UI + TaskCard
  theme/colors.ts
  types/index.ts
```

## Адаптация сложности

Скор 1.0–5.0. После дня:

- высокий % выполнения и «легко» → сложнее на следующие дни
- пропуски / «сложно» → легче

Незавершённые будущие дни пересобираются.

## Примечание

Не коммитьте реальные API-ключи. Файл `.env` в `.gitignore`.
