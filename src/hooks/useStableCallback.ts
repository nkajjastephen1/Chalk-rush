import { useCallback, useLayoutEffect, useRef } from 'react';

/** Returns a callback with a stable identity that always calls the latest `fn`. */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
