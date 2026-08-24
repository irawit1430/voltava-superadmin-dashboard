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
import { io, type Socket } from 'socket.io-client';
import { api, toPage } from '../lib/api';
import type { BusLocation, Notification } from '../types';
import { isValidLatLng } from '../lib/format';

/**
 * One socket for the whole app, plus the live data that rides on it.
 *
 * Two problems this solves:
 *
 * 1. The socket used to be opened inside the Dashboard effect and torn down on
 *    unmount, so live tracking only existed while you were looking at the
 *    dashboard tab.
 * 2. Nothing in the UI knew whether the socket was actually up. The dashboard
 *    wore three hardcoded green badges — REAL-TIME MONITORING, ONLINE, and
 *    "All Systems Operational" — so a dropped connection left every bus marker
 *    frozen on screen with the UI still claiming it was live. `connected` and
 *    `lastEventAt` exist so the interface can tell the truth.
 */

/** Poll interval for alerts, as a floor under the socket. */
const NOTIFICATION_POLL_MS = 60_000;

/**
 * Event names we listen for. The backend has not confirmed which it emits for
 * alerts, so we subscribe to the plausible set and keep polling regardless —
 * see the backend request list in BACKEND_REQUESTS.md.
 */
const ALERT_EVENTS = ['notification', 'notification_new', 'alert', 'sos_alert', 'sos'];

export interface FleetContextValue {
  connected: boolean;
  /** Set when the socket refuses to connect (bad token, server down). */
  connectionError: string | null;
  /** Epoch ms of the last live event, so the UI can show a real "as of" clock. */
  lastEventAt: number | null;
  locations: Record<string, BusLocation>;
  locationsError: string | null;
  notifications: Notification[];
  unresolvedCount: number;
  resolveNotification: (id: string) => Promise<void>;
  resolveAll: () => Promise<{ resolved: number; failed: number }>;
  refresh: () => void;
}

const FleetContext = createContext<FleetContextValue | null>(null);

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error('useFleet must be used inside <FleetProvider>');
  return ctx;
}

function isResolved(n: Notification) {
  return (n.status || '').toUpperCase() === 'RESOLVED';
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [locations, setLocations] = useState<Record<string, BusLocation>>({});
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonce, setNonce] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  /* ---------------- initial + polled REST data ---------------- */

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    api
      .get<unknown>('/api/devices/locations', controller.signal)
      .then((data) => {
        const { items } = toPage<any>(data);
        const next: Record<string, BusLocation> = {};
        for (const raw of items) {
          const lat = Number(raw.lastKnownLat ?? raw.lat);
          const lng = Number(raw.lastKnownLng ?? raw.lng);
          if (!isValidLatLng(lat, lng)) continue; // never hand Leaflet a null fix
          const busId = String(raw.busId ?? raw.deviceId ?? raw.id);
          next[busId] = {
            busId,
            lat,
            lng,
            speed: Number(raw.speed) || 0,
            timestamp: raw.lastUpdate ?? raw.timestamp ?? new Date().toISOString(),
            licensePlate: raw.licensePlate ?? null,
            serialNumber: raw.serialNumber ?? null,
            schoolName: raw.schoolName ?? null,
          };
        }
        setLocations(next);
        setLocationsError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLocationsError(err?.message ?? 'Could not load vehicle positions.');
      });

    return () => controller.abort();
  }, [token, nonce]);

  const loadNotifications = useCallback(
    (signal?: AbortSignal) =>
      api
        .get<unknown>('/api/notifications', signal)
        .then((data) => setNotifications(toPage<Notification>(data).items))
        .catch(() => {
          /* the bell degrades quietly; a failed poll must not blank the list */
        }),
    [],
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadNotifications(controller.signal);

    const id = window.setInterval(() => loadNotifications(), NOTIFICATION_POLL_MS);
    // Coming back to the tab should not require waiting out the interval.
    const onFocus = () => loadNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      controller.abort();
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, loadNotifications, nonce]);

  /* ---------------- socket ---------------- */

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason !== 'io client disconnect') {
        setConnectionError('Live connection dropped. Reconnecting…');
      }
    });

    socket.on('connect_error', (err) => {
      // Previously silent: an expired token failed the socket with no signal at
      // all, while every fetch would have redirected to login.
      setConnected(false);
      setConnectionError(err?.message ?? 'Could not open the live connection.');
    });

    socket.on('location_update', (data: any) => {
      const lat = Number(data?.lat ?? data?.lastKnownLat);
      const lng = Number(data?.lng ?? data?.lastKnownLng);
      const busId = String(data?.busId ?? data?.deviceId ?? data?.id);
      setLastEventAt(Date.now());
      if (!busId || !isValidLatLng(lat, lng)) return;
      setLocations((prev) => ({
        ...prev,
        [busId]: {
          busId,
          lat,
          lng,
          speed: Number(data.speed) || 0,
          timestamp: data.timestamp ?? data.lastUpdate ?? new Date().toISOString(),
          licensePlate: data.licensePlate ?? prev[busId]?.licensePlate ?? null,
          serialNumber: data.serialNumber ?? prev[busId]?.serialNumber ?? null,
          schoolName: data.schoolName ?? prev[busId]?.schoolName ?? null,
        },
      }));
    });

    const onAlert = (payload: any) => {
      setLastEventAt(Date.now());
      if (!payload) return loadNotifications();
      const incoming: Notification = {
        id: payload.id ?? `local-${Date.now()}`,
        type: payload.type ?? null,
        title: payload.title ?? 'New alert',
        message: payload.message ?? null,
        status: payload.status ?? 'ACTIVE',
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };
      setNotifications((prev) =>
        prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev],
      );
    };
    ALERT_EVENTS.forEach((name) => socket.on(name, onAlert));

    return () => {
      ALERT_EVENTS.forEach((name) => socket.off(name, onAlert));
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, loadNotifications]);

  /* ---------------- actions ---------------- */

  const resolveNotification = useCallback(async (id: string) => {
    await api.post(`/api/notifications/${id}/resolve`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'RESOLVED' } : n)),
    );
  }, []);

  const resolveAll = useCallback(async () => {
    const pending = notifications.filter((n) => !isResolved(n));
    if (!pending.length) return { resolved: 0, failed: 0 };

    const results = await Promise.allSettled(
      pending.map(async (n) => {
        await api.post(`/api/notifications/${n.id}/resolve`);
        return n.id;
      }),
    );

    const done = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value),
    );

    setNotifications((prev) =>
      prev.map((n) => (done.has(n.id) ? { ...n, status: 'RESOLVED' } : n)),
    );

    return { resolved: done.size, failed: results.length - done.size };
  }, [notifications]);

  const value = useMemo<FleetContextValue>(
    () => ({
      connected,
      connectionError,
      lastEventAt,
      locations,
      locationsError,
      notifications,
      unresolvedCount: notifications.filter((n) => !isResolved(n)).length,
      resolveNotification,
      resolveAll,
      refresh,
    }),
    [
      connected,
      connectionError,
      lastEventAt,
      locations,
      locationsError,
      notifications,
      resolveNotification,
      resolveAll,
      refresh,
    ],
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}
