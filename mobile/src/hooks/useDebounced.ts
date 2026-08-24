import { useEffect, useRef, useState } from 'react';

/** Value that only updates once the input has been still for `delay` ms. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Calls `fn` at most once per `delay` ms of quiet, and once more on unmount so
 * nothing typed in the last half-second is ever lost. This is what makes the
 * journal's "you never press save" promise safe to make.
 */
export function useAutosave<T>(value: T, fn: (value: T) => void, delay = 600) {
  const latest = useRef(value);
  const callback = useRef(fn);
  const dirty = useRef(false);
  const first = useRef(true);

  latest.current = value;
  callback.current = fn;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    const timer = setTimeout(() => {
      dirty.current = false;
      callback.current(latest.current);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  useEffect(
    () => () => {
      // Flush on unmount — closing the editor must not drop the last keystroke.
      if (dirty.current) callback.current(latest.current);
    },
    [],
  );
}
