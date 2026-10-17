import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { type ThemePref, themeStore } from '../services/themeStore';

let pref: ThemePref = 'system';
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// Overriding Appearance makes useColorScheme (and so useColors, the status bar and
// navigation theme) follow the choice everywhere, with no per-component wiring.
function apply(next: ThemePref) {
  pref = next;
  Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  listeners.forEach(l => l());
}

/** Applies the saved theme; call once at startup. */
export const loadThemePref = () => themeStore.get().then(apply, () => {});

/** The chosen theme (system / light / dark) and a setter that saves it. */
export function useThemePref() {
  const value = useSyncExternalStore(subscribe, () => pref);
  const set = (next: ThemePref) => {
    apply(next);
    themeStore.set(next).catch(() => {});
  };
  return [value, set] as const;
}
