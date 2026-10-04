import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Can3D from './src/Can3D';
import Stats from './src/Stats';
import { dayKey, loadDrinks, saveDrinks } from './src/data';

const LIME = '#a8e02a';

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [drinks, setDrinks] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tapSignal, setTapSignal] = useState(0);
  const [screen, setScreen] = useState<'home' | 'stats'>('home');
  const player = useAudioPlayer(require('./assets/hiss.wav'));

  useEffect(() => {
    loadDrinks().then((d) => {
      setDrinks(d);
      setLoaded(true);
    });
  }, []);

  const today = dayKey(new Date());
  const todayCount = drinks.filter((t) => dayKey(new Date(t)) === today).length;

  const persist = useCallback((next: number[]) => {
    setDrinks(next);
    saveDrinks(next);
  }, []);

  const open = useCallback(() => {
    if (!loaded) return;
    player.seekTo(0);
    player.play();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTapSignal((n) => n + 1);
    persist([...drinks, Date.now()]);
  }, [loaded, drinks, player, persist]);

  const undo = useCallback(() => {
    const idx = [...drinks].reverse().findIndex((t) => dayKey(new Date(t)) === today);
    if (idx === -1) return;
    const real = drinks.length - 1 - idx;
    persist(drinks.filter((_, i) => i !== real));
  }, [drinks, today, persist]);

  if (screen === 'stats') {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <Stats drinks={drinks} onBack={() => setScreen('home')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.label}>СЕГОДНЯ ВЫПИТО</Text>
        <Text style={styles.count}>{todayCount}</Text>
      </View>

      <View style={styles.scene}>
        <Can3D count={todayCount} tapSignal={tapSignal} onPress={open} />
      </View>

      <Text style={styles.hint}>{todayCount === 0 ? 'Нажми на банку — откроем' : 'Ещё одну? Жми на банку'}</Text>

      <View style={styles.row}>
        <Pressable style={styles.undo} onPress={undo} disabled={todayCount === 0}>
          <Text style={[styles.undoTxt, todayCount === 0 && { opacity: 0.3 }]}>−1</Text>
        </Pressable>
        <Pressable style={styles.statBtn} onPress={() => setScreen('stats')}>
          <Text style={styles.statTxt}>Статистика</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07090a' },
  header: { alignItems: 'center', paddingTop: 8 },
  label: { color: '#7d8a8f', letterSpacing: 3, fontSize: 12, fontWeight: '700' },
  count: { color: LIME, fontSize: 64, fontWeight: '900', lineHeight: 72 },
  scene: { flex: 1 },
  hint: { color: '#7d8a8f', textAlign: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  undo: { width: 64, borderRadius: 16, backgroundColor: '#12171a', alignItems: 'center', justifyContent: 'center' },
  undoTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statBtn: { flex: 1, backgroundColor: LIME, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  statTxt: { color: '#07090a', fontSize: 17, fontWeight: '900' },
});
