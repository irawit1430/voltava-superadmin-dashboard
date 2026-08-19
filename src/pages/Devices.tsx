import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cpu, Search, X, Plus, Trash2, Pencil, Copy, Check, ShieldAlert } from 'lucide-react';
import { api, toPage, query, errorMessage } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { relativeTime, freshness, normaliseStatus, isOnline, STALE_MINUTES } from '../lib/format';
import type { Device, School } from '../types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DeviceStatusBadge,
  IconButton,
  KpiCard,
  Modal,
  Pagination,
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
  useToast,
} from '../components/ui';
import { cn } from '../lib/utils';

const PAGE_SIZE = 25;
const STATUSES = ['All statuses', 'Online', 'Offline'];

export function Devices() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep links from global search land here with ?q=, so the match the search
  // found is still applied when the page opens.
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const search = useDebounced(searchInput, 300);
  const [status, setStatus] = useState(() => {
    const fromUrl = searchParams.get('status');
    return STATUSES.find((s) => s.toLowerCase() === (fromUrl ?? '').toLowerCase()) ?? STATUSES[0];
  });
  const [page, setPage] = useState(1);
  const [staleFirst, setStaleFirst] = useState(false);

  const [isAddOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Device | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);
  const [secret, setSecret] = useState<{ deviceId: string; value: string } | null>(null);

  const statusParam = status === STATUSES[0] ? undefined : status.toUpperCase();

  const devices = useApi(
    (signal) =>
      api
        .get<unknown>(
          `/api/devices${query({ page, limit: PAGE_SIZE, search, status: statusParam })}`,
          signal,
        )
        .then((data) => toPage<Device>(data)),
    [page, search, statusParam],
  );

  const schools = useApi(
    (signal) =>
      api
        .get<unknown>(`/api/schools${query({ limit: 500 })}`, signal)
        .then((data) => toPage<School>(data)),
    [],
  );

  const items = devices.data?.items ?? [];
  const total = devices.data?.total ?? 0;

  const statusFilterIgnored = useMemo(() => {
    if (!statusParam || items.length === 0) return false;
    return items.some((d) => normaliseStatus(d.status || 'OFFLINE') !== statusParam);
  }, [items, statusParam]);

  /**
   * "Which devices went dark?" is the most common question on this screen and
   * there was no way to ask it — `lastPing` rendered as a raw ISO string with no
   * ordering and no threshold.
   */
  const rows = useMemo(() => {
    if (!staleFirst) return items;
    return [...items].sort((a, b) => {
      const at = a.lastPing ? new Date(a.lastPing).getTime() : 0;
      const bt = b.lastPing ? new Date(b.lastPing).getTime() : 0;
      return at - bt;
    });
  }, [items, staleFirst]);

  const onPage = items.length;
  const onlineOnPage = items.filter((d) => isOnline(d.status)).length;
  const staleOnPage = items.filter((d) => freshness(d.lastPing) !== 'live').length;

  useEffect(() => {
    // Keep the URL in step so the view is shareable and survives a reload.
    // Only write when something actually differs — `setSearchParams` changes the
    // location, which re-runs this effect, so an unconditional call can loop.
    const next = new URLSearchParams();
    if (searchInput) next.set('q', searchInput);
    if (status !== STATUSES[0]) next.set('status', status);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchInput, status, searchParams, setSearchParams]);

  const resetFilters = () => {
    setSearchInput('');
    setStatus(STATUSES[0]);
    setStaleFirst(false);
    setPage(1);
  };

  const filtersActive = !!searchInput || status !== STATUSES[0] || staleFirst;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">Hardware devices</h1>
          {!devices.loading && <Badge tone="brand">{total.toLocaleString()} total</Badge>}
        </div>
        <Button onClick={() => setAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Provision device
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Devices registered"
          value={total}
          loading={devices.loading}
          icon={<Cpu className="w-3.5 h-3.5" />}
          basis="Across the whole fleet"
        />
        <KpiCard
          label="Online"
          value={onlineOnPage}
          loading={devices.loading}
          tone="ok"
          /* The header used to read "{total} TOTAL / {n}% ACTIVE / {n} ERRORS"
             where the total came from the server and the other two were counted
             off the current 50 rows. Same row, two populations, no indication. */
          basis={`Within the ${onPage} shown`}
        />
        <KpiCard
          label={`Silent over ${STALE_MINUTES} min`}
          value={staleOnPage}
          loading={devices.loading}
          tone={staleOnPage > 0 ? 'danger' : 'neutral'}
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
          basis={`Within the ${onPage} shown`}
        />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-44"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
            <label htmlFor="device-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="device-search"
                type="search"
                placeholder="Device ID, serial, or plate…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <Button
            variant={staleFirst ? 'primary' : 'secondary'}
            onClick={() => setStaleFirst((v) => !v)}
            aria-pressed={staleFirst}
          >
            Quietest first
          </Button>

          {filtersActive && (
            <Button variant="ghost" onClick={resetFilters} icon={<X className="w-4 h-4" />}>
              Clear
            </Button>
          )}
        </div>

        {statusFilterIgnored && (
          <div className="p-3 border-b border-slate-100">
            <ErrorBanner message="The server returned devices outside the selected status, so status filtering isn't supported by the API yet. These results are unfiltered." />
          </div>
        )}

        {devices.error ? (
          <ErrorState message={devices.error} onRetry={devices.reload} />
        ) : (
          <>
            <DataTable>
              <thead className="border-b border-slate-200">
                <tr>
                  <Th>Device ID</Th>
                  <Th>Serial number</Th>
                  <Th>Assigned school</Th>
                  <Th>Bus plate</Th>
                  <Th>Last ping</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.loading ? (
                  <TableSkeleton rows={8} cols={7} />
                ) : (
                  rows.map((device) => (
                    <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                      <Td>
                        <CellInline
                          icon={<Cpu className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />}
                        >
                          <span className="font-mono text-xs font-medium text-brand-700">
                            {device.deviceId}
                          </span>
                        </CellInline>
                      </Td>
                      {/* This column used to render `licensePlate || serialNumber`,
                          duplicating the plate column and hiding the one
                          identifier you can read off the physical unit. */}
                      <Td className="font-mono text-xs text-slate-600">
                        {device.serialNumber || '—'}
                      </Td>
                      <Td className="text-slate-800 font-medium">
                        {device.school?.name ?? (device.schoolId ? '—' : 'Unassigned')}
                      </Td>
                      <Td className="text-slate-600">{device.licensePlate || '—'}</Td>
                      <Td>
                        <LastPing value={device.lastPing} />
                      </Td>
                      <Td>
                        <DeviceStatusBadge status={device.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label={`Edit ${device.deviceId}`}
                            onClick={() => setEditTarget(device)}
                          >
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            label={`Delete ${device.deviceId}`}
                            tone="danger"
                            onClick={() => setDeleteTarget(device)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>

            <CardList>
              {rows.map((device) => (
                <CardRow
                  key={device.id}
                  title={<span className="font-mono text-sm">{device.deviceId}</span>}
                  subtitle={device.school?.name ?? 'Unassigned'}
                  badge={<DeviceStatusBadge status={device.status} />}
                  rows={[
                    { label: 'Serial', value: device.serialNumber || '—' },
                    { label: 'Plate', value: device.licensePlate || '—' },
                    { label: 'Last ping', value: <LastPing value={device.lastPing} /> },
                  ]}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setEditTarget(device)}
                        icon={<Pencil className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="dangerGhost"
                        onClick={() => setDeleteTarget(device)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Delete
                      </Button>
                    </>
                  }
                />
              ))}
            </CardList>

            {/* This check used to read `devices.length === 0` while the table
                rendered a filtered array, so a filter that matched nothing gave
                you a header with an empty body and no message at all. */}
            {!devices.loading && rows.length === 0 && (
              <EmptyState
                icon={<Cpu className="w-5 h-5" />}
                title={filtersActive ? 'No devices match these filters' : 'No devices yet'}
                body={
                  filtersActive
                    ? 'Nothing here fits the current search and status.'
                    : 'Provision your first tracker to start receiving positions.'
                }
                action={
                  filtersActive ? (
                    <Button variant="secondary" size="sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      Provision device
                    </Button>
                  )
                }
              />
            )}

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              noun="devices"
            />
          </>
        )}
      </Card>

      <ProvisionModal
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
        schools={schools.data?.items ?? []}
        onProvisioned={(device) => {
          toast.success('Device provisioned', `${device.deviceId} is registered.`);
          if (device.deviceSecret) {
            setSecret({ deviceId: device.deviceId, value: device.deviceSecret });
          }
          devices.reload();
        }}
      />

      <EditDeviceModal
        device={editTarget}
        schools={schools.data?.items ?? []}
        onClose={() => setEditTarget(null)}
        onSaved={(device) => {
          toast.success('Device updated', `${device.deviceId} saved.`);
          devices.reload();
        }}
      />

      <DeviceSecretModal secret={secret} onClose={() => setSecret(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.deviceId ?? 'device'}?`}
        body="The tracker stops reporting to the platform. Its historical data may be removed too."
        consequences={
          deleteTarget?.school?.name
            ? [`Assignment to ${deleteTarget.school.name}`, 'Live tracking for the attached bus']
            : ['Live tracking for the attached bus']
        }
        confirmLabel="Delete device"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/api/devices/${deleteTarget.id}`);
          toast.success(`${deleteTarget.deviceId} deleted`);
          devices.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LastPing({ value }: { value?: string | null }) {
  const state = freshness(value);
  const tone = {
    live: 'text-slate-700',
    stale: 'text-warn-700 font-semibold',
    critical: 'text-danger-700 font-semibold',
    never: 'text-slate-500',
  }[state];

  return (
    <span className={cn('text-sm whitespace-nowrap', tone)} title={value ?? 'Never reported'}>
      {relativeTime(value)}
    </span>
  );
}

function ProvisionModal({
  open,
  onClose,
  schools,
  onProvisioned,
}: {
  open: boolean;
  onClose: () => void;
  schools: School[];
  onProvisioned: (device: Device) => void;
}) {
  const [form, setForm] = useState({
    deviceId: '',
    licensePlate: '',
    schoolId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setForm({ deviceId: '', licensePlate: '', schoolId: '' });
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // `serialNumber` is deliberately not sent: the backend confirmed
      // POST /api/devices does not accept it. Collecting a field that gets
      // silently dropped is worse than not offering it, so the input is gone
      // too — see the open ask for the Device model in BACKEND_REQUESTS.md.
      const device = await api.post<Device>('/api/devices', {
        deviceId: form.deviceId,
        licensePlate: form.licensePlate || undefined,
        schoolId: form.schoolId || undefined,
      });
      onProvisioned(device);
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Provision a device"
      description="Register a tracker so it can report positions."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="provision-form" loading={submitting}>
            Provision
          </Button>
        </>
      }
    >
      <form id="provision-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <TextField
          label="Device ID"
          required
          value={form.deviceId}
          onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
          placeholder="TM100-XXX"
          hint="The identifier printed on the unit. This is what the API stores."
        />
        <TextField
          label="License plate"
          value={form.licensePlate}
          onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
          placeholder="DL1P-1234"
        />
        <SelectField
          label="Assign to school"
          value={form.schoolId}
          onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
          hint="Can be assigned later from the school's profile."
        >
          <option value="">Unassigned</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
      </form>
    </Modal>
  );
}

/**
 * Editing was missing entirely: a wrong plate or a device on the wrong school
 * could only be fixed by deleting and re-provisioning, which mints a new secret
 * and forces the unit back through onboarding. `deviceId` stays read-only — it's
 * how the platform addresses the unit, so changing it here would orphan the
 * hardware rather than rename it.
 */
function EditDeviceModal({
  device,
  schools,
  onClose,
  onSaved,
}: {
  device: Device | null;
  schools: School[];
  onClose: () => void;
  onSaved: (device: Device) => void;
}) {
  const [form, setForm] = useState({ licensePlate: '', schoolId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  // Seed once per device, the same pattern the school and admin edit forms use.
  if (device && seeded !== device.id) {
    setSeeded(device.id);
    setForm({
      licensePlate: device.licensePlate ?? '',
      schoolId: device.schoolId ?? '',
    });
    setError(null);
  }

  const close = () => {
    setSeeded(null);
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!device || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // null clears the value; the assign flow already uses PUT for schoolId.
      const updated = await api.put<Device>(`/api/devices/${device.id}`, {
        licensePlate: form.licensePlate.trim() || null,
        schoolId: form.schoolId || null,
      });
      onSaved(updated);
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!device}
      onClose={close}
      title={`Edit ${device?.deviceId ?? 'device'}`}
      description="Change the vehicle plate or which school this tracker belongs to."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-device-form" loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-device-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div>
          <p className="label mb-1.5">Device ID</p>
          <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-600 break-all">
            {device?.deviceId}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            How the platform addresses this unit. It can't be changed here.
          </p>
        </div>

        <TextField
          label="License plate"
          value={form.licensePlate}
          onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
          placeholder="DL1P-1234"
        />

        <SelectField
          label="Assigned school"
          value={form.schoolId}
          onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
          hint="Choose Unassigned to detach it from its current school."
        >
          <option value="">Unassigned</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
      </form>
    </Modal>
  );
}

/**
 * The device secret is shown exactly once and can never be retrieved again. It
 * previously arrived in a native `alert()` — no copy button, no confirmation
 * that it was saved, and one stray Enter key lost the credential permanently.
 */
function DeviceSecretModal({
  secret,
  onClose,
}: {
  secret: { deviceId: string; value: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (secret) {
      setCopied(false);
      setAcknowledged(false);
    }
  }, [secret]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret?.value ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={!!secret}
      onClose={() => acknowledged && onClose()}
      title="Save this device secret now"
      description="This is the only time it will be shown. It cannot be recovered later."
      size="md"
      footer={
        <Button onClick={onClose} disabled={!acknowledged}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg bg-warn-50 border border-warn-100">
          <ShieldAlert className="w-4 h-4 text-warn-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-warn-700">
            Store it in your password manager or the hardware provisioning sheet before closing
            this dialog. If you lose it, the device has to be re-provisioned.
          </p>
        </div>

        <div>
          <p className="label mb-1.5">Device {secret?.deviceId}</p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2.5 bg-slate-900 text-brand-300 rounded-lg text-sm font-mono break-all select-all">
              {secret?.value}
            </code>
            <Button
              variant="secondary"
              onClick={copy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-700">
            I have saved this secret somewhere safe.
          </span>
        </label>
      </div>
    </Modal>
  );
}
