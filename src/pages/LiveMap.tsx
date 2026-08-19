import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, WifiOff, Gauge, Building2, Radio } from 'lucide-react';

import { useFleet } from '../context/FleetProvider';
import { useSettings } from '../context/SettingsProvider';
import { relativeTime } from '../lib/format';
import { busIcon } from '../lib/busIcon';
import { Badge, EmptyState, ErrorBanner } from '../components/ui';
import { cn } from '../lib/utils';
import type { BusLocation } from '../types';

type MoveFilter = 'all' | 'moving' | 'parked';

function label(v: BusLocation): string {
  return v.licensePlate || v.serialNumber || v.busId;
}

export function LiveMap() {
  const { connected, lastEventAt, locations, locationsError } = useFleet();
  const { settings } = useSettings();

  const [searchInput, setSearchInput] = useState('');
  const [moveFilter, setMoveFilter] = useState<MoveFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const vehicles = useMemo(() => Object.values(locations), [locations]);

  const filtered = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return vehicles
      .filter((v) => {
        if (moveFilter === 'moving' && !(v.speed > 0)) return false;
        if (moveFilter === 'parked' && v.speed > 0) return false;
        if (!term) return true;
        return [v.licensePlate, v.serialNumber, v.schoolName, v.busId]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term));
      })
      .sort((a, b) => label(a).localeCompare(label(b)));
  }, [vehicles, searchInput, moveFilter]);

  const movingCount = vehicles.filter((v) => v.speed > 0).length;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">Live map</h1>
          {connected ? (
            <Badge tone="ok" dot>
              Live
            </Badge>
          ) : (
            <Badge tone="danger" dot>
              Feed down
            </Badge>
          )}
          {lastEventAt && connected && (
            <span className="text-xs text-slate-500 tabular-nums">
              updated {relativeTime(lastEventAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 tabular-nums">
          {vehicles.length} reporting · {movingCount} moving
        </p>
      </div>

      {locationsError && <ErrorBanner message={locationsError} />}

      <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[30rem]">
        {/* Vehicle list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden order-2 lg:order-1">
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Plate, serial, or school…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Search vehicles"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1 mt-2" role="group" aria-label="Filter by motion">
              {(['all', 'moving', 'parked'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMoveFilter(f)}
                  aria-pressed={moveFilter === f}
                  className={cn(
                    'flex-1 h-7 rounded-md text-xs font-semibold capitalize transition-colors',
                    moveFilter === f
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 lg:max-h-none">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Radio className="w-5 h-5" />}
                  title={vehicles.length === 0 ? 'No vehicles reporting' : 'Nothing matches'}
                  body={
                    vehicles.length === 0
                      ? connected
                        ? 'Positions appear here as devices start sending data.'
                        : 'The live feed is down, so no current positions are available.'
                      : 'Try a different search or filter.'
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((v) => {
                  const moving = v.speed > 0;
                  const active = selected === v.busId;
                  return (
                    <li key={v.busId}>
                      <button
                        onClick={() => setSelected(v.busId)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                          active ? 'bg-brand-50' : 'hover:bg-slate-50',
                        )}
                        aria-pressed={active}
                      >
                        <span
                          className={cn(
                            'mt-1 shrink-0 w-2.5 h-2.5 rounded-full',
                            !connected ? 'bg-slate-400' : moving ? 'bg-ok-500' : 'bg-warn-500',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800 truncate">
                            {label(v)}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {v.schoolName ? (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3 h-3" aria-hidden="true" />
                                {v.schoolName}
                              </span>
                            ) : (
                              'Unassigned'
                            )}
                          </span>
                          <span className="block text-[11px] text-slate-400 tabular-nums mt-0.5">
                            {moving ? `${Math.round(v.speed)} km/h` : 'Stationary'} ·{' '}
                            {relativeTime(v.timestamp)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm h-[55vh] lg:h-full order-1 lg:order-2 z-0">
          <MapContainer
            center={[settings.mapCenterLat ?? 28.7041, settings.mapCenterLng ?? 77.1025]}
            zoom={settings.mapDefaultZoom ?? 10}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <FitToFleet points={vehicles.map((v) => [v.lat, v.lng] as [number, number])} />
            <FlyToSelected target={selected ? locations[selected] : null} />
            {vehicles.map((v) => (
              <Marker
                key={v.busId}
                position={[v.lat, v.lng]}
                icon={busIcon(v.speed, connected)}
                eventHandlers={{ click: () => setSelected(v.busId) }}
              >
                <Popup>
                  <div className="font-bold border-b border-slate-100 pb-1 mb-1">{label(v)}</div>
                  <div className="text-xs flex items-center gap-1">
                    <Gauge className="w-3 h-3" aria-hidden="true" />
                    {Math.round(v.speed)} km/h
                  </div>
                  {v.schoolName && <div className="text-xs">School: {v.schoolName}</div>}
                  <div className="text-[11px] text-slate-500 mt-1">
                    Reported {relativeTime(v.timestamp)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {!connected && (
            <div className="absolute inset-x-0 bottom-0 z-[400] bg-slate-950/85 px-3 py-2 text-[11px] text-danger-300 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Positions frozen — showing last known locations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Frames the map on the vehicles that actually exist, once. Without it an
 * operator whose fleet is in another city opens to an empty patch of map and
 * concludes nothing is live.
 */
function FitToFleet({ points }: { points: [number, number][] }) {
  const map = useMap();
  const [fitted, setFitted] = useState(false);

  useEffect(() => {
    if (fitted || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }
    setFitted(true);
  }, [points, map, fitted]);

  return null;
}

/** Pans to the vehicle picked in the list, keeping the current zoom if closer. */
function FlyToSelected({ target }: { target: BusLocation | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [target, map]);
  return null;
}
