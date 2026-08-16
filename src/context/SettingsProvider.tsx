import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { GlobalSettings } from '../types';

/**
 * Global settings, made available to the app that is supposed to obey them.
 *
 * The settings page previously saved `mapCenterLat` / `mapCenterLng` to the
 * backend and nothing ever read them back — the dashboard hardcoded Delhi, so
 * an operator in Mumbai saved their coordinates and still opened to an empty
 * viewport. `maintenanceMode` had the same problem: persisted, never checked.
 */

export const DEFAULT_SETTINGS: Required<
  Pick<
    GlobalSettings,
    | 'maintenanceMode'
    | 'mapCenterLat'
    | 'mapCenterLng'
    | 'mapDefaultZoom'
    | 'overspeedLimitKph'
    | 'offlineAlertMinutes'
  >
> = {
  maintenanceMode: false,
  mapCenterLat: 28.7041,
  mapCenterLng: 77.1025,
  mapDefaultZoom: 10,
  overspeedLimitKph: 60,
  offlineAlertMinutes: 30,
};

interface SettingsContextValue {
  settings: GlobalSettings;
  loading: boolean;
  error: string | null;
  /** Merge a patch locally after a successful save, so the app reacts at once. */
  applyLocal: (patch: Partial<GlobalSettings>) => void;
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);

    api
      .get<GlobalSettings>('/api/settings', controller.signal)
      .then((data) => {
        // Merge over defaults so a partial payload can't blank the map centre.
        setSettings({ ...DEFAULT_SETTINGS, ...(data ?? {}) });
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Settings are non-critical: fall back to defaults rather than blocking
        // the whole console, but keep the reason around for the settings page.
        setError(err?.message ?? 'Could not load global settings.');
        setSettings(DEFAULT_SETTINGS);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [token, nonce]);

  const applyLocal = useCallback((patch: Partial<GlobalSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, error, applyLocal, reload: () => setNonce((n) => n + 1) }),
    [settings, loading, error, applyLocal],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
