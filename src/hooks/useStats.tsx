import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { applyGameSummary, EMPTY_STATS, type GameSummary, type PlayerStats } from '@/features/stats/stats';
import {
  loadPlayedWords,
  loadStats,
  mergePlayedWords,
  resetStats as resetStoredStats,
  savePlayedWords,
  saveStats,
} from '@/services/storage';

interface StatsContextValue {
  stats: PlayerStats;
  loaded: boolean;
  /** Words the player has formed in previous games. */
  playedWords: ReadonlySet<string>;
  recordGame: (summary: GameSummary, wordsFormed: readonly string[]) => void;
  reset: () => Promise<void>;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<PlayerStats>(EMPTY_STATS);
  const [playedWords, setPlayedWords] = useState<readonly string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const recordedIds = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;
    Promise.all([loadStats(), loadPlayedWords()]).then(([s, words]) => {
      if (!alive) return;
      setStats(s);
      setPlayedWords(words);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const recordGame = useCallback((summary: GameSummary, wordsFormed: readonly string[]) => {
    if (recordedIds.current.has(summary.id)) return;
    recordedIds.current.add(summary.id);
    setStats((prev) => {
      const next = applyGameSummary(prev, summary);
      saveStats(next);
      return next;
    });
    setPlayedWords((prev) => {
      const next = mergePlayedWords(prev, wordsFormed);
      savePlayedWords(next);
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    const fresh = await resetStoredStats();
    setStats(fresh);
    setPlayedWords([]);
  }, []);

  const playedSet = useMemo(() => new Set(playedWords), [playedWords]);
  const value = useMemo(
    () => ({ stats, loaded, playedWords: playedSet, recordGame, reset }),
    [stats, loaded, playedSet, recordGame, reset],
  );
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used inside StatsProvider');
  return ctx;
}
