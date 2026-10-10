import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { haptics } from '@/services/haptics';
import { sound } from '@/services/sound';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '@/services/storage';

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  /** Effective reduce-motion flag (user override or OS preference). */
  reduceMotion: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const systemReduceMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
    haptics.setEnabled(settings.hapticsEnabled);
  }, [settings.soundEnabled, settings.hapticsEnabled]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reduceMotion =
    settings.reduceMotion === 'on' || (settings.reduceMotion === 'system' && systemReduceMotion);

  const value = useMemo(
    () => ({ settings, loaded, update, reduceMotion }),
    [settings, loaded, update, reduceMotion],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
