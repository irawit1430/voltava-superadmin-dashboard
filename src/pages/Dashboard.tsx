import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Bus,
  Users,
  ArrowRight,
  Radio,
  WifiOff,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { api, toPage, query } from '../lib/api';
import { useApi } from '../lib/useApi';
import { busIcon } from '../lib/busIcon';
import { formatNumber, formatTime, relativeTime } from '../lib/format';
import { useFleet } from '../context/FleetProvider';
import { useSettings } from '../context/SettingsProvider';
import type { Stats, School, LogEntry } from '../types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  KpiCard,
  DataTable,
  Th,
  Td,
  CellInline,
  CardList,
  CardRow,
  TableSkeleton,
  Skeleton,
  EmptyState,
  ErrorState,
  ErrorBanner,
} from '../components/ui';
import { cn } from '../lib/utils';

const RECENT_SCHOOLS = 5;

export function Dashboard() {
  const { connected, lastEventAt, locations, locationsError } = useFleet();
  const { settings } = useSettings();

  const stats = useApi<Stats>((signal) => api.get<Stats>('/api/admin/stats', signal), []);

  // Server-side ordering and limit. This table is titled "Recently onboarded"
  // but used to take whatever order the API returned and slice five rows off
  // the front, with no sort at all.
  const recentSchools = useApi(
    (signal) =>
      api
        .get<unknown>(
          `/api/schools${query({ page: 1, limit: RECENT_SCHOOLS, sort: 'createdAt', order: 'desc' })}`,
          signal,
        )
        .then((data) => toPage<School>(data)),
    [],
  );

  const logs = useApi(
    (signal) =>
      api.get<unknown>('/api/admin/logs', signal).then((data) => toPage<LogEntry>(data)),
    [],
  );

  const markers = useMemo(() => Object.values(locations), [locations]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-slate-800">System overview</h1>
        <LiveIndicator connected={connected} lastEventAt={lastEventAt} />
      </div>

      {stats.error && <ErrorBanner message={stats.error} onRetry={stats.reload} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active schools"
          value={stats.data?.totalSchools ?? '—'}
          loading={stats.loading}
          icon={<Building2 className="w-3.5 h-3.5" />}
          hint={<GrowthHint percent={stats.data?.schoolsGrowthPercent} />}
        />
        <KpiCard
          label="Buses running"
          value={stats.data?.totalBuses ?? '—'}
          loading={stats.loading}
          icon={<Bus className="w-3.5 h-3.5" />}
          hint={<GrowthHint percent={stats.data?.busesGrowthPercent} />}
        />
        <KpiCard
          label="Offline GPS devices"
          value={stats.data?.offlineDevices ?? '—'}
          loading={stats.loading}
          // 0 offline is a healthy state, not an alarm — only go red when there
          // is actually something to review. Mirrors the "Silent over 30 min"
          // tile on the Devices page.
          tone={(stats.data?.offlineDevices ?? 0) > 0 ? 'danger' : 'neutral'}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          hint={
            (stats.data?.offlineDevices ?? 0) > 0 ? (
              <Link to="/devices?status=Offline" className="mb-1">
                <Badge tone="danger">Review</Badge>
              </Link>
            ) : undefined
          }
        />
        <KpiCard
          label="Students tracked"
          value={stats.data?.totalStudents ?? '—'}
          loading={stats.loading}
          icon={<Users className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Recently onboarded schools */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recently onboarded schools"
            subtitle={`The ${RECENT_SCHOOLS} newest clients`}
            actions={
              <Link to="/schools">
                <Button size="sm" variant="secondary" icon={<ArrowRight className="w-4 h-4" />}>
                  Full directory
                </Button>
              </Link>
            }
          />

          {recentSchools.error ? (
            <ErrorState message={recentSchools.error} onRetry={recentSchools.reload} />
          ) : (
            <>
              <DataTable>
                <thead className="border-b border-slate-200">
                  <tr>
                    <Th>School ID</Th>
                    <Th>Name</Th>
                    <Th>City</Th>
                    <Th align="center">Active buses</Th>
                    <Th align="right">Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSchools.loading ? (
                    <TableSkeleton rows={RECENT_SCHOOLS} cols={5} />
                  ) : (
                    recentSchools.data?.items.map((school) => (
                      <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                        <Td className="font-mono text-xs">
                          <Link
                            to={`/schools/${school.id}`}
                            className="text-brand-700 font-medium hover:underline"
                          >
                            {school.id}
                          </Link>
                        </Td>
                        <Td>
                          <CellInline
                            icon={
                              <span className="w-6 h-6 rounded bg-brand-50 flex items-center justify-center shrink-0">
                                <Building2 className="w-3 h-3 text-brand-600" aria-hidden="true" />
                              </span>
                            }
                          >
                            <span className="font-medium text-slate-800">{school.name}</span>
                          </CellInline>
                        </Td>
                        <Td className="text-slate-600">
                          {[school.city, school.state].filter(Boolean).join(', ') || '—'}
                        </Td>
                        <Td align="center">
                          <Badge tone={school.activeBuses ? 'ok' : 'neutral'}>
                            {school.activeBuses ?? 0} active
                          </Badge>
                        </Td>
                        <Td align="right">
                          <Link
                            to={`/schools/${school.id}`}
                            className="text-sm text-brand-700 font-semibold hover:underline"
                          >
                            Manage
                          </Link>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>

              <CardList>
                {recentSchools.data?.items.map((school) => (
                  <CardRow
                    key={school.id}
                    title={
                      <Link to={`/schools/${school.id}`} className="hover:underline">
                        {school.name}
                      </Link>
                    }
                    subtitle={[school.city, school.state].filter(Boolean).join(', ')}
                    badge={
                      <Badge tone={school.activeBuses ? 'ok' : 'neutral'}>
                        {school.activeBuses ?? 0} buses
                      </Badge>
                    }
                  />
                ))}
              </CardList>

              {!recentSchools.loading && !recentSchools.data?.items.length && (
                <EmptyState
                  icon={<Building2 className="w-5 h-5" />}
                  title="No schools onboarded yet"
                  body="Add your first client to start tracking their fleet."
                  action={
                    <Link to="/schools">
                      <Button size="sm">Add a school</Button>
                    </Link>
                  }
                />
              )}
            </>
          )}
        </Card>

        {/* Live network + logs */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Live network
              </h3>
              <ConnectionChip connected={connected} />
            </div>

            {locationsError && (
              <p className="mb-3 text-xs text-danger-300 bg-danger-500/10 border border-danger-500/30 rounded p-2">
                {locationsError}
              </p>
            )}

            <div className="w-full h-[300px] sm:h-[380px] bg-slate-800 rounded-lg relative overflow-hidden mb-3 border border-slate-700 z-0">
              <MapContainer
                center={[
                  settings.mapCenterLat ?? 28.7041,
                  settings.mapCenterLng ?? 77.1025,
                ]}
                zoom={settings.mapDefaultZoom ?? 10}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <FitToFleet points={markers.map((m) => [m.lat, m.lng] as [number, number])} />
                {markers.map((loc) => (
                  <Marker
                    key={loc.busId}
                    position={[loc.lat, loc.lng]}
                    icon={busIcon(loc.speed, connected)}
                  >
                    <Popup>
                      <div className="font-bold border-b border-slate-100 pb-1 mb-1">
                        {loc.licensePlate || loc.serialNumber || loc.busId}
                      </div>
                      <div className="text-xs">Speed: {Math.round(loc.speed)} km/h</div>
                      {loc.schoolName && <div className="text-xs">School: {loc.schoolName}</div>}
                      <div className="text-[11px] text-slate-500 mt-1">
                        Reported {relativeTime(loc.timestamp)}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {!connected && (
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 px-3 py-2 text-[11px] text-danger-300 flex items-center gap-2">
                  <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Positions frozen — showing last known locations
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mb-3 tabular-nums">
              {markers.length} vehicle{markers.length === 1 ? '' : 's'} reporting
              {lastEventAt ? ` · last update ${relativeTime(lastEventAt)}` : ''}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Active" value={stats.data?.activeDevices} tone="ok" loading={stats.loading} />
              <MiniStat
                label="Stationary"
                value={stats.data?.stationaryDevices}
                tone="warn"
                loading={stats.loading}
              />
              <MiniStat
                label="Warnings"
                value={stats.data?.warning}
                tone="danger"
                loading={stats.loading}
              />
            </div>
          </div>

          <Card>
            <CardHeader title="System logs" subtitle="Most recent vehicle reports" />
            {logs.error ? (
              <ErrorState message={logs.error} onRetry={logs.reload} />
            ) : logs.loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !logs.data?.items.length ? (
              <EmptyState
                icon={<Radio className="w-5 h-5" />}
                title="No reports yet"
                body="Vehicle reports appear here as devices start sending data."
              />
            ) : (
              <ul className="p-4 space-y-4">
                {logs.data.items.slice(0, 8).map((log) => {
                  const moving = (log.speed ?? 0) > 0;
                  return (
                    <li key={log.id} className="flex gap-3">
                      <span
                        className={cn(
                          'mt-1.5 shrink-0 w-2 h-2 rounded-full',
                          moving ? 'bg-ok-500' : 'bg-warn-500',
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-tight break-words">
                          {log.bus?.licensePlate || log.serialNumber || log.busId || 'Unknown bus'}
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {moving ? `Moving at ${Math.round(log.speed!)} km/h` : 'Stationary'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {relativeTime(log.timestamp)} · {formatTime(log.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A growth figure that tells the truth about its own sign. The old markup
 * hardcoded a leading "+" and a green up-arrow, so a negative period rendered
 * as "+-5%" in green pointing up — the opposite of what happened.
 */
function GrowthHint({ percent }: { percent?: number | null }) {
  if (percent == null) return null;
  const up = percent >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs font-semibold mb-1 tabular-nums',
        up ? 'text-ok-700' : 'text-danger-700',
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {up ? '+' : ''}
      {percent}%
    </span>
  );
}

/**
 * Was a permanent green "REAL-TIME MONITORING" pill that never consulted the
 * socket. If the connection dropped, the map froze and this kept insisting the
 * data was live.
 */
function LiveIndicator({
  connected,
  lastEventAt,
}: {
  connected: boolean;
  lastEventAt: number | null;
}) {
  if (!connected) {
    return (
      <Badge tone="danger" dot>
        Live feed down
      </Badge>
    );
  }
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <Badge tone="ok" dot>
        Live
      </Badge>
      {lastEventAt && (
        <span className="text-xs text-slate-500 tabular-nums">
          updated {relativeTime(lastEventAt)}
        </span>
      )}
    </span>
  );
}

function ConnectionChip({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        'text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded border flex items-center gap-1.5',
        connected
          ? 'bg-ok-500/15 text-ok-300 border-ok-500/30'
          : 'bg-danger-500/15 text-danger-300 border-danger-500/30',
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-ok-400 animate-pulse' : 'bg-danger-400')}
        aria-hidden="true"
      />
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value?: number;
  tone: 'ok' | 'warn' | 'danger';
  loading?: boolean;
}) {
  const colour = { ok: 'text-ok-400', warn: 'text-warn-400', danger: 'text-danger-400' }[tone];
  return (
    <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
      <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
      {loading ? (
        <Skeleton className="h-5 w-8 mx-auto bg-slate-700" />
      ) : (
        <p className={cn('text-sm font-bold tabular-nums', colour)}>{formatNumber(value ?? 0)}</p>
      )}
    </div>
  );
}

/**
 * Frames the map on the vehicles that actually exist. Without this the viewport
 * is a fixed point — an operator whose fleet is in another city opens to an
 * empty map and concludes nothing is live.
 */
function FitToFleet({ points }: { points: [number, number][] }) {
  const map = useMap();
  const [hasFitted, setHasFitted] = useState(false);

  useEffect(() => {
    if (hasFitted || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
    setHasFitted(true);
  }, [points, map, hasFitted]);

  return null;
}
