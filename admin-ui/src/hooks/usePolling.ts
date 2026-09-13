import { useEffect, useRef, useCallback } from 'react';

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number = 30000,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    if (enabled) {
      intervalRef.current = setInterval(() => {
        savedCallback.current();
      }, intervalMs);
    }
  }, [intervalMs, enabled, stop]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { start, stop };
}
