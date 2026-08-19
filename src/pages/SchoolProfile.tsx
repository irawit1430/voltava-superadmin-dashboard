import { useMemo, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  Download,
  Edit2,
  Bus,
  Route,
  Users,
  MapPin,
  Mail,
  Phone,
  Globe,
  Plus,
  Cpu,
  ExternalLink,
  ArrowLeft,
  Unlink,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { api, toPage, query, errorMessage, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { formatDate, relativeTime, isOnline, isValidLatLng, freshness } from '../lib/format';
import { SCHOOL_STATUSES, type School, type Device, type SchoolStats } from '../types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DeviceStatusBadge,
  IconButton,
  Modal,
  SchoolStatusBadge,
  SelectField,
  TextField,
  DataTable,
  Th,
  Td,
  CellInline,
  CardList,
  CardRow,
  TableSkeleton,
  EmptyState,
  ErrorState,
  ErrorBanner,
  Skeleton,
  useToast,
} from '../components/ui';
import { cn } from '../lib/utils';

/** Device health colours match the rest of the app: ok green, danger rose. */
const HEALTH_COLOURS = { healthy: '#10b981', unhealthy: '#f43f5e' };

/** Empty -> undefined, never 0. 0,0 is a real point in the Gulf of Guinea. */
function toCoord(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function SchoolProfile() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [isEditOpen, setEditOpen] = useState(false);
  const [isAssignOpen, setAssignOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<Device | null>(null);

  /**
   * Fetch the one school by ID.
   *
   * This previously pulled the entire (unpaginated, unlimited) schools list and
   * did `find(...) || list[0]` — so a school that wasn't on the first page
   * rendered a *different* school's data under the requested URL. Editing from
   * that state wrote one school's values to another school's ID.
   *
   * Now: try the by-ID endpoint, fall back to a search for that ID, and if it
   * genuinely isn't there, say so. Never substitute a different record.
   */
  const school = useApi<School>(async (signal) => {
    if (!id) throw new ApiError('No school ID in the URL.', 400);
    try {
      const direct = await api.get<any>(`/api/schools/${id}`, signal);
      const record = direct?.data ?? direct;
      if (record?.id) return record as School;
    } catch (err) {
      // 404 is a real answer; anything else is worth a fallback attempt.
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError('That school does not exist, or has been removed.', 404);
      }
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }

    const { items } = toPage<School>(
      await api.get<unknown>(`/api/schools${query({ search: id, limit: 100 })}`, signal),
    );
    const found = items.find((s) => s.id === id);
    if (!found) {
      throw new ApiError('That school does not exist, or has been removed.', 404);
    }
    return found;
  }, [id]);

  const stats = useApi<SchoolStats | null>(
    (signal) =>
      api
        .get<SchoolStats>(`/api/schools/${id}/stats`, signal)
        .catch(() => null), // stats are a nice-to-have; the page still works without
    [id],
  );

  const devices = useApi(
    (signal) =>
      api
        .get<unknown>(`/api/devices${query({ schoolId: id, limit: 200 })}`, signal)
        .then((data) => {
          const { items } = toPage<Device>(data);
          // Guard in case the API ignores `schoolId` — this list must never
          // show another school's hardware.
          return items.filter((d) => d.schoolId === id);
        }),
    [id],
  );

  const deviceList = devices.data ?? [];
  const healthy = deviceList.filter((d) => isOnline(d.status)).length;
  const unhealthy = deviceList.length - healthy;
  const healthPercent = deviceList.length
    ? Math.round((healthy / deviceList.length) * 100)
    : 0;

  /**
   * Device health, not vehicle activity.
   *
   * The old donut fed itself `status === 'ONLINE'` and labelled the slices
   * "On-Duty (En Route)" and "Offline / Maintenance", with a caption reading
   * "N buses require inspection". A powered tracker sitting in the depot counted
   * as en route; a bus in a tunnel counted as needing inspection. Those are two
   * different questions and this chart only answers one of them.
   */
  const healthData = useMemo(
    () => [
      { name: 'Reporting', value: healthy, color: HEALTH_COLOURS.healthy },
      { name: 'Not reporting', value: unhealthy, color: HEALTH_COLOURS.unhealthy },
    ],
    [healthy, unhealthy],
  );

  const exportCsv = () => {
    if (!school.data) return;
    const rows = [
      ['Device ID', 'Serial number', 'License plate', 'Status', 'Last ping', 'Registered'],
      ...deviceList.map((d) => [
        d.deviceId ?? '',
        d.serialNumber ?? '',
        d.licensePlate ?? '',
        d.status ?? 'OFFLINE',
        d.lastPing ?? '',
        d.createdAt ?? '',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${school.data.name.replace(/[^\w-]+/g, '-')}-devices.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export ready', `${deviceList.length} devices written to CSV.`);
  };

  if (school.loading) return <ProfileSkeleton />;

  if (school.error || !school.data) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <ErrorState message={school.error ?? 'School not found.'} onRetry={school.reload} />
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <Link to="/schools">
              <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to directory
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const s = school.data;
  const hasCoords = isValidLatLng(s.latitude, s.longitude);
  const address = [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <nav className="flex items-center text-sm text-slate-600" aria-label="Breadcrumb">
        <Link to="/schools" className="hover:text-slate-900 hover:underline transition-colors">
          Schools
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="font-medium text-slate-900">{s.name}</span>
      </nav>

      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start justify-between gap-5">
        <div className="flex items-start gap-4 sm:gap-6 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-brand-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">{s.name}</h1>
              {/* Was hardcoded to "Active" regardless of the record. */}
              <SchoolStatusBadge status={s.status} />
            </div>
            <p className="text-slate-600 flex items-start gap-1.5 text-sm">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              {/* Was a hardcoded "1242 Education Plaza, {city}, {state} 62704"
                  while the real address sat unused in the payload. */}
              <span className="break-words">{address || 'No address on record'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <Button
            variant="secondary"
            onClick={exportCsv}
            disabled={!deviceList.length}
            icon={<Download className="w-4 h-4" />}
          >
            Export devices
          </Button>
          <Button onClick={() => setEditOpen(true)} icon={<Edit2 className="w-4 h-4" />}>
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          label="Total buses"
          value={stats.data?.totalBuses}
          loading={stats.loading}
          icon={<Bus className="w-3.5 h-3.5" />}
        />
        <StatTile
          label="Active routes"
          value={stats.data?.totalRoutes}
          loading={stats.loading}
          icon={<Route className="w-3.5 h-3.5" />}
        />
        <StatTile
          label="Students"
          value={stats.data?.totalStudents}
          loading={stats.loading}
          icon={<Users className="w-3.5 h-3.5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card>
          <CardHeader title="School information" />
          <div className="p-5 space-y-6">
            <Contact
              icon={<Users className="w-4 h-4" />}
              label="Contact person"
              value={s.contactPerson}
            />
            {/* Email, phone and website were all fabricated from the school name
                — `j.moore@{name}.edu`, `+1 (217) 555-0192`, `www.{name}.edu` —
                and rendered as live mailto and outbound links. */}
            <Contact
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              value={s.contactEmail}
              href={s.contactEmail ? `mailto:${s.contactEmail}` : undefined}
            />
            <Contact
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={s.contactPhone}
              href={s.contactPhone ? `tel:${s.contactPhone.replace(/\s+/g, '')}` : undefined}
            />
            <Contact
              icon={<Mail className="w-4 h-4" />}
              label="Office email"
              value={s.email}
              href={s.email ? `mailto:${s.email}` : undefined}
            />
            <Contact
              icon={<Phone className="w-4 h-4" />}
              label="Office phone"
              value={s.phone}
              href={s.phone ? `tel:${s.phone.replace(/\s+/g, '')}` : undefined}
            />
            <Contact
              icon={<Globe className="w-4 h-4" />}
              label="Website"
              value={s.website}
              href={s.website ? (s.website.startsWith('http') ? s.website : `https://${s.website}`) : undefined}
              external
            />

            <div>
              <p className="label mb-2">Location</p>
              {hasCoords ? (
                /* Was a stock Unsplash photo with a pin dropped dead-centre, in
                   an app that already ships Leaflet. */
                <div className="h-40 rounded-lg overflow-hidden border border-slate-200 relative z-0">
                  <MapContainer
                    center={[s.latitude!, s.longitude!]}
                    zoom={14}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    <Marker
                      position={[s.latitude!, s.longitude!]}
                      icon={L.divIcon({
                        html: `<div style="background:#059669;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
                        className: '',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                    />
                  </MapContainer>
                </div>
              ) : (
                <div className="h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-4">
                  <p className="text-sm text-slate-500">
                    No coordinates on record for this school.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Device health"
            subtitle="Whether this school's trackers are reporting — not whether buses are moving"
            actions={
              <Link to={`/devices?q=${encodeURIComponent(s.name)}`}>
                <Button size="sm" variant="secondary" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open in devices
                </Button>
              </Link>
            }
          />
          <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-12">
            {devices.loading ? (
              <Skeleton className="w-44 h-44 rounded-full" />
            ) : deviceList.length === 0 ? (
              <p className="text-sm text-slate-500 py-8">No devices assigned yet.</p>
            ) : (
              <>
                <div className="w-44 h-44 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {healthData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">
                      {healthPercent}%
                    </p>
                    <p className="label">Reporting</p>
                  </div>
                </div>

                <div className="space-y-4 w-full max-w-xs">
                  {healthData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">
                        {item.value} / {deviceList.length}
                      </span>
                    </div>
                  ))}

                  <div
                    className={cn(
                      'mt-4 p-3 rounded-lg border flex gap-3 text-sm',
                      unhealthy > 0
                        ? 'bg-danger-50 border-danger-100 text-danger-700'
                        : 'bg-ok-50 border-ok-100 text-ok-700',
                    )}
                  >
                    <Cpu className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      {unhealthy > 0
                        ? `${unhealthy} device${unhealthy === 1 ? '' : 's'} not reporting. Check power and SIM connectivity before dispatching a technician.`
                        : 'All trackers are reporting normally.'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Hardware devices"
          subtitle={`${deviceList.length} assigned to this school`}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAssignOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Assign device
            </Button>
          }
        />

        {devices.error ? (
          <ErrorState message={devices.error} onRetry={devices.reload} />
        ) : (
          <>
            <DataTable>
              <thead className="border-b border-slate-200">
                <tr>
                  <Th>Device ID</Th>
                  <Th>Serial number</Th>
                  <Th>Plate</Th>
                  <Th>Registered</Th>
                  <Th>Last ping</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.loading ? (
                  <TableSkeleton rows={4} cols={7} />
                ) : (
                  deviceList.map((device) => (
                    <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                      <Td className="font-mono text-xs text-brand-700 font-medium">
                        {device.deviceId}
                      </Td>
                      <Td className="font-mono text-xs text-slate-600">
                        {device.serialNumber || '—'}
                      </Td>
                      <Td className="text-slate-600">{device.licensePlate || '—'}</Td>
                      <Td className="text-slate-600">{formatDate(device.createdAt)}</Td>
                      <Td
                        className={cn(
                          freshness(device.lastPing) === 'critical' && 'text-danger-700 font-semibold',
                          freshness(device.lastPing) === 'stale' && 'text-warn-700 font-semibold',
                        )}
                      >
                        {relativeTime(device.lastPing)}
                      </Td>
                      <Td>
                        <DeviceStatusBadge status={device.status} />
                      </Td>
                      <Td align="right">
                        <IconButton
                          label={`Unassign ${device.deviceId} from ${s.name}`}
                          onClick={() => setUnassignTarget(device)}
                        >
                          <Unlink className="w-4 h-4" />
                        </IconButton>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>

            <CardList>
              {deviceList.map((device) => (
                <CardRow
                  key={device.id}
                  title={<span className="font-mono text-sm">{device.deviceId}</span>}
                  subtitle={device.licensePlate || 'No plate recorded'}
                  badge={<DeviceStatusBadge status={device.status} />}
                  rows={[
                    { label: 'Serial', value: device.serialNumber || '—' },
                    { label: 'Last ping', value: relativeTime(device.lastPing) },
                  ]}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => setUnassignTarget(device)}
                      icon={<Unlink className="w-3.5 h-3.5" />}
                    >
                      Unassign
                    </Button>
                  }
                />
              ))}
            </CardList>

            {!devices.loading && deviceList.length === 0 && (
              <EmptyState
                icon={<Cpu className="w-5 h-5" />}
                title="No devices assigned"
                body="Assign an unallocated tracker to start receiving positions for this school."
                action={
                  <Button size="sm" onClick={() => setAssignOpen(true)}>
                    Assign device
                  </Button>
                }
              />
            )}
          </>
        )}
      </Card>

      <EditSchoolModal
        open={isEditOpen}
        school={s}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success('Profile updated');
          school.reload();
        }}
      />

      <AssignDeviceModal
        open={isAssignOpen}
        schoolId={id!}
        schoolName={s.name}
        onClose={() => setAssignOpen(false)}
        onAssigned={(device) => {
          toast.success('Device assigned', `${device.deviceId} now belongs to ${s.name}.`);
          // Refresh both — the KPI tiles above are derived from the school's own
          // stats, which the old code left showing pre-assignment numbers.
          devices.reload();
          stats.reload();
        }}
      />

      <ConfirmDialog
        open={!!unassignTarget}
        onClose={() => setUnassignTarget(null)}
        title={`Unassign ${unassignTarget?.deviceId ?? 'device'}?`}
        body={`It stops reporting for ${s.name} and returns to the unassigned pool, where it can be assigned to another school. The tracker itself is not deleted.`}
        confirmLabel="Unassign device"
        onConfirm={async () => {
          if (!unassignTarget) return;
          // Detach by clearing the school — the same PUT the assign flow uses.
          await api.put(`/api/devices/${unassignTarget.id}`, { schoolId: null });
          toast.success(`${unassignTarget.deviceId} unassigned`);
          devices.reload();
          stats.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatTile({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value?: number;
  loading?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-1.5">
        <p className="label">{label}</p>
        <div className="w-7 h-7 rounded bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <h2 className="text-2xl font-bold text-slate-800 tabular-nums">
          {value ?? <span className="text-slate-400">—</span>}
        </h2>
      )}
    </div>
  );
}

function Contact({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-slate-400 mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="label mb-0.5">{label}</p>
        {!value ? (
          <p className="text-slate-500 italic">Not provided</p>
        ) : href ? (
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-brand-700 hover:underline font-medium break-words"
          >
            {value}
          </a>
        ) : (
          <p className="font-medium text-slate-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

function EditSchoolModal({
  open,
  school,
  onClose,
  onSaved,
}: {
  open: boolean;
  school: School;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = () => ({
    name: school.name ?? '',
    status: (school.status ?? 'ACTIVE').toUpperCase(),
    address: school.address ?? '',
    city: school.city ?? '',
    state: school.state ?? '',
    pincode: school.pincode ?? '',
    latitude: school.latitude != null ? String(school.latitude) : '',
    longitude: school.longitude != null ? String(school.longitude) : '',
    contactPerson: school.contactPerson ?? '',
    contactEmail: school.contactEmail ?? '',
    contactPhone: school.contactPhone ?? '',
    email: school.email ?? '',
    phone: school.phone ?? '',
    website: school.website ?? '',
  });

  const [form, setForm] = useState(seed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  if (open && !seeded) {
    setSeeded(true);
    setForm(seed());
    setError(null);
  }

  const close = () => {
    setSeeded(false);
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const lat = toCoord(form.latitude);
    const lng = toCoord(form.longitude);
    if ((lat === undefined) !== (lng === undefined)) {
      setError('Enter both latitude and longitude, or clear both.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/api/schools/${school.id}`, {
        name: form.name,
        status: form.status,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        // null clears a coordinate; undefined would leave the old value behind.
        latitude: lat ?? null,
        longitude: lng ?? null,
        contactPerson: form.contactPerson || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
      });
      onSaved();
      close();
    } catch (err) {
      // The old copy hardcoded "(500 Error). Please inform the backend team."
      // regardless of what actually failed.
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit school profile"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-school-form" loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-school-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid sm:grid-cols-[1fr_10rem] gap-4">
          <TextField
            label="School name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {SCHOOL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
        </div>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">Address</legend>
          <div className="space-y-4">
            <TextField
              label="Street address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid sm:grid-cols-3 gap-4">
              <TextField
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <TextField
                label="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <TextField
                label="Pincode"
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="28.7041"
              />
              <TextField
                label="Longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="77.1025"
              />
            </div>
            <p className="text-xs text-slate-500">
              Coordinates draw the location map above. Clear both to remove it.
            </p>
          </div>
        </fieldset>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">Primary contact</legend>
          <div className="space-y-4">
            <TextField
              label="Contact person"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Their email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
              <TextField
                label="Their phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">School office</legend>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Office email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                label="Office phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <TextField
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="school.edu.in"
            />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function AssignDeviceModal({
  open,
  schoolId,
  schoolName,
  onClose,
  onAssigned,
}: {
  open: boolean;
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  onAssigned: (device: Device) => void;
}) {
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useApi(async (signal) => {
    if (!open) return [] as Device[];
    // Ask the server for unassigned devices; fall back to filtering if the
    // parameter is ignored. The old code fetched `?limit=1000` and filtered
    // client-side with no indication when the API capped the page lower.
    const { items } = toPage<Device>(
      await api.get<unknown>(`/api/devices${query({ assigned: 'false', limit: 500 })}`, signal),
    );
    return items.filter((d) => !d.schoolId);
  }, [open]);

  const options = available.data ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const device = await api.put<Device>(`/api/devices/${selected}`, { schoolId });
      onAssigned(device);
      setSelected('');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign a device"
      description={`Attach an unallocated tracker to ${schoolName}.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-form"
            loading={submitting}
            disabled={!options.length || !selected}
          >
            Assign device
          </Button>
        </>
      }
    >
      <form id="assign-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        {available.loading ? (
          <Skeleton className="h-10 w-full" />
        ) : available.error ? (
          <ErrorBanner message={available.error} onRetry={available.reload} />
        ) : options.length === 0 ? (
          <div className="p-3 rounded-lg bg-warn-50 border border-warn-100 text-sm text-warn-700">
            No unassigned devices are available. Provision one from the Devices page first.
          </div>
        ) : (
          <SelectField
            label="Unassigned device"
            required
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a device…</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deviceId}
                {d.serialNumber ? ` — ${d.serialNumber}` : ''}
                {d.licensePlate ? ` (${d.licensePlate})` : ''}
              </option>
            ))}
          </SelectField>
        )}
      </form>
    </Modal>
  );
}
