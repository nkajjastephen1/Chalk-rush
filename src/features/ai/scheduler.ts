/**
 * AI searches are written as generators that `yield` periodically. This lets the same
 * search run synchronously in tests and in small time slices on the JS thread in the app,
 * so animations and touches stay responsive while the computer is thinking.
 */
export type Task<T> = Generator<void, T, void>;

export interface CancelToken {
  cancelled: boolean;
}

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'CancelledError';
  }
}

export function runToCompletion<T>(task: Task<T>): T {
  for (;;) {
    const step = task.next();
    if (step.done) return step.value;
  }
}

export function runCooperatively<T>(
  task: Task<T>,
  options: { sliceMs?: number; cancel?: CancelToken; now?: () => number } = {},
): Promise<T> {
  const sliceMs = options.sliceMs ?? 8;
  const now = options.now ?? (() => Date.now());
  return new Promise<T>((resolve, reject) => {
    const tick = () => {
      if (options.cancel?.cancelled) {
        task.return(undefined as never);
        reject(new CancelledError());
        return;
      }
      const start = now();
      try {
        while (now() - start < sliceMs) {
          const step = task.next();
          if (step.done) {
            resolve(step.value);
            return;
          }
        }
      } catch (err) {
        reject(err);
        return;
      }
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  });
}
