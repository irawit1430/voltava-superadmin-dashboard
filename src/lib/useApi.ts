import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Runs an async loader on mount and whenever `deps` change, with cancellation.
 *
 * The old pages fired bare `fetch` calls inside effects with no cleanup, so a
 * fast filter change could land an older response after a newer one. Aborting
 * on cleanup removes that race and stops React warning about setState after
 * unmount.
 */
export function useApi<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { reload: () => void; setData: (updater: T | ((prev: T | null) => T)) => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  // Keep the latest loader without making it a dependency — callers pass an
  // inline arrow, which would otherwise re-run the effect on every render.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (!active || (err instanceof DOMException && err.name === 'AbortError')) return;
        setState({ data: null, error: errorMessage(err), loading: false });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setState((prev) => ({
      ...prev,
      data:
        typeof updater === 'function'
          ? (updater as (p: T | null) => T)(prev.data)
          : updater,
    }));
  }, []);

  return { ...state, reload, setData };
}

/** Debounce a rapidly-changing value (search boxes) before it hits the network. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
