# Gorilla Counter

Low-poly 3D энергетик. Тап по банке — шипение, +1 к сегодняшнему счёту, рядом появляется выпитая банка.
Кнопка «Статистика»: неделя, месяц (календарь), год, всё время, рекорд, серия, литры.

```
cd gorilla
npm install
npx expo start      # откройте QR в Expo Go на iPhone
```
Звук шипения генерируется `node scripts/make-hiss.js` (уже лежит в assets/).

## TestFlight
Нужен платный Apple Developer аккаунт и аккаунт на expo.dev.
```
npm i -g eas-cli
eas login
eas init                                   # привяжет проект к вашему аккаунту
eas build --platform ios --profile production
eas submit --platform ios --latest         # зальёт в App Store Connect -> TestFlight
```
Bundle ID — `com.dilukliu0.gorillacounter` (app.json), при желании поменяйте на свой.
