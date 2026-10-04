# Gorilla Counter

Low-poly 3D энергетик. Тап по банке — шипение, +1 к сегодняшнему счёту, рядом появляется выпитая банка.
Кнопка «Статистика»: неделя, месяц (календарь), год, всё время, рекорд, серия, литры.

```
cd gorilla
npm install
npx expo start      # откройте QR в Expo Go на iPhone
```
Звук шипения генерируется `node scripts/make-hiss.js` (уже лежит в assets/).
