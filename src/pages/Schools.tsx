import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  X,
  HeartHandshake,
  ClipboardList,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { api, toPage, query, errorMessage, ApiError } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { normaliseStatus } from '../lib/format';
import { SCHOOL_STATUSES, type School } from '../types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  IconButton,
  KpiCard,
  Modal,
  Pagination,
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
  useToast,
} from '../components/ui';

const PAGE_SIZE = 25;
// Backend enforces uppercase (ACTIVE | PENDING | SUSPENDED), so send it that way.
const FILTERS = ['All statuses', ...SCHOOL_STATUSES] as const;
const ALL = FILTERS[0];

const BLANK_FORM = {
  name: '',
  status: 'ACTIVE',
  address: '',
  city: '',
  state: '',
  pincode: '',
  // Kept as strings so an empty box stays empty. `parseFloat('') || 0` would
  // send 0,0 — a real-looking coordinate in the Gulf of Guinea.
  latitude: '',
  longitude: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  email: '',
  phone: '',
  website: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  deviceId: '',
  licensePlate: '',
};

/** Empty -> undefined, never 0. */
function toCoord(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function blank(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

export function Schools() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const search = useDebounced(searchInput, 300);
  const [status, setStatus] = useState(searchParams.get('status') ?? ALL);
  const [page, setPage] = useState(1);

  const [isAddOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);

  const statusParam = status === ALL ? undefined : status;

  const schools = useApi(
    (signal) =>
      api
        .get<unknown>(
          `/api/schools${query({ page, limit: PAGE_SIZE, search, status: statusParam })}`,
          signal,
        )
        .then((data) => toPage<School>(data)),
    [page, search, statusParam],
  );

  const items = schools.data?.items ?? [];
  const total = schools.data?.total ?? 0;

  /**
   * Filtering has to happen on the server, or the counts and the pagination
   * disagree with each other. If the backend ignores `status`, say so instead of
   * quietly showing unfiltered rows under a filtered heading.
   */
  const statusFilterIgnored = useMemo(() => {
    if (!statusParam || items.length === 0) return false;
    return items.some((s) => normaliseStatus(s.status) !== normaliseStatus(statusParam));
  }, [items, statusParam]);

  const resetFilters = () => {
    setSearchInput('');
    setStatus(ALL);
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const filtersActive = !!searchInput || status !== ALL;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">Schools directory</h1>
          {!schools.loading && <Badge tone="brand">{total.toLocaleString()} total</Badge>}
        </div>
        <Button onClick={() => setAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add school
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total schools"
          value={total}
          loading={schools.loading}
          icon={<Building2 className="w-3.5 h-3.5" />}
          basis="Across the whole directory"
        />
        <KpiCard
          label="Active partnerships"
          value={items.filter((s) => normaliseStatus(s.status) === 'ACTIVE').length}
          loading={schools.loading}
          icon={<HeartHandshake className="w-3.5 h-3.5" />}
          tone="ok"
          /* These two counts come from the rows currently loaded. Saying so is
             the honest fix until the backend exposes counts by status — the old
             page put a page-local number next to a server-wide total with no
             indication they were different populations. */
          basis={`Within the ${items.length} shown`}
        />
        <KpiCard
          label="Pending verification"
          value={items.filter((s) => normaliseStatus(s.status) === 'PENDING').length}
          loading={schools.loading}
          icon={<ClipboardList className="w-3.5 h-3.5" />}
          tone="warn"
          basis={`Within the ${items.length} shown`}
        />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-end gap-3">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-48"
          >
            {FILTERS.map((s) => (
              // Value stays uppercase for the API; the label reads normally.
              <option key={s} value={s}>
                {s === ALL ? s : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
            <label htmlFor="school-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="school-search"
                type="search"
                placeholder="Name, city, contact…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {filtersActive && (
            <Button variant="secondary" onClick={resetFilters} icon={<X className="w-4 h-4" />}>
              Clear filters
            </Button>
          )}
        </div>

        {statusFilterIgnored && (
          <div className="p-3 border-b border-slate-100">
            <ErrorBanner message="The server returned schools outside the selected status, so status filtering isn't supported by the API yet. These results are unfiltered." />
          </div>
        )}

        {schools.error ? (
          <ErrorState message={schools.error} onRetry={schools.reload} />
        ) : (
          <>
            <DataTable>
              <thead className="border-b border-slate-200">
                <tr>
                  <Th>School ID</Th>
                  <Th>Name</Th>
                  <Th>City / district</Th>
                  <Th>Contact person</Th>
                  <Th align="center">Active buses</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.loading ? (
                  <TableSkeleton rows={6} cols={7} />
                ) : (
                  items.map((school) => (
                    <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                      <Td className="font-mono text-xs text-slate-600">{school.id}</Td>
                      <Td>
                        <CellInline
                          icon={
                            <span className="w-6 h-6 rounded bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-3 h-3" aria-hidden="true" />
                            </span>
                          }
                        >
                          <Link
                            to={`/schools/${school.id}`}
                            className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                          >
                            {school.name}
                          </Link>
                        </CellInline>
                      </Td>
                      <Td className="text-slate-600">{school.city || '—'}</Td>
                      <Td className="text-slate-600">{school.contactPerson || '—'}</Td>
                      <Td align="center" className="font-medium text-slate-800">
                        {school.activeBuses ?? 0}
                      </Td>
                      <Td>
                        <SchoolStatusBadge status={school.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/schools/${school.id}`}>
                            <IconButton label={`Open ${school.name}`}>
                              <ExternalLink className="w-4 h-4" />
                            </IconButton>
                          </Link>
                          <IconButton
                            label={`Delete ${school.name}`}
                            tone="danger"
                            onClick={() => setDeleteTarget(school)}
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
              {items.map((school) => (
                <CardRow
                  key={school.id}
                  title={
                    <Link to={`/schools/${school.id}`} className="hover:underline">
                      {school.name}
                    </Link>
                  }
                  subtitle={[school.city, school.state].filter(Boolean).join(', ')}
                  badge={<SchoolStatusBadge status={school.status} />}
                  rows={[
                    { label: 'Contact', value: school.contactPerson || '—' },
                    { label: 'Active buses', value: school.activeBuses ?? 0 },
                  ]}
                  actions={
                    <>
                      <Link to={`/schools/${school.id}`} className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full">
                          Manage
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="dangerGhost"
                        onClick={() => setDeleteTarget(school)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Delete
                      </Button>
                    </>
                  }
                />
              ))}
            </CardList>

            {!schools.loading && items.length === 0 && (
              <EmptyState
                icon={<Building2 className="w-5 h-5" />}
                title={filtersActive ? 'No schools match these filters' : 'No schools yet'}
                body={
                  filtersActive
                    ? 'Nothing here fits the current search and status.'
                    : 'Add your first client to start onboarding their fleet.'
                }
                action={
                  filtersActive ? (
                    <Button variant="secondary" size="sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      Add school
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
              noun="schools"
            />
          </>
        )}
      </Card>

      <AddSchoolModal
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
        onDone={(message) => {
          toast.success('School added', message);
          setPage(1);
          schools.reload();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? 'school'}?`}
        body="This removes the client from the platform. It cannot be undone."
        consequences={[
          `${deleteTarget?.activeBuses ?? 0} bus${(deleteTarget?.activeBuses ?? 0) === 1 ? '' : 'es'} currently tracked for this school`,
          'Device assignments belonging to this school',
          'Sign-in access for this school’s admins',
        ]}
        confirmPhrase={deleteTarget?.name}
        confirmLabel="Delete school"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/api/schools/${deleteTarget.id}`);
          toast.success(`${deleteTarget.name} deleted`);
          schools.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Onboarding creates up to three records. The old version fired all three and
 * only checked the first response, so a duplicate admin email produced a school
 * with no working login and a modal that closed as if everything had worked.
 *
 * Now: the school is the only required step, each optional step reports its own
 * outcome, and the summary says exactly what did and didn't get created.
 */
function AddSchoolModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (summary: string) => void;
}) {
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const set = (key: keyof typeof BLANK_FORM) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const close = () => {
    setForm(BLANK_FORM);
    setError(null);
    setWarnings([]);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return; // a double-click used to create the school twice

    const lat = toCoord(form.latitude);
    const lng = toCoord(form.longitude);
    if ((lat === undefined) !== (lng === undefined)) {
      setError('Enter both latitude and longitude, or leave both blank.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setWarnings([]);

    try {
      const created = await api.post<any>('/api/schools', {
        name: form.name,
        status: form.status,
        address: blank(form.address),
        city: blank(form.city),
        state: blank(form.state),
        pincode: blank(form.pincode),
        latitude: lat,
        longitude: lng,
        contactPerson: blank(form.contactPerson),
        contactEmail: blank(form.contactEmail),
        contactPhone: blank(form.contactPhone),
        email: blank(form.email),
        phone: blank(form.phone),
        website: blank(form.website),
      });

      const schoolId = created?.id ?? created?.data?.id;
      const notes: string[] = [];

      if (!schoolId) {
        notes.push(
          'The school was created but the server did not return its ID, so the admin and device steps were skipped.',
        );
      }

      if (schoolId && form.adminEmail && form.adminPassword) {
        try {
          await api.post('/api/admins', {
            name: form.adminName || form.contactPerson || 'School Admin',
            email: form.adminEmail,
            password: form.adminPassword,
            role: 'SCHOOL_ADMIN',
            schoolId,
          });
        } catch (err) {
          notes.push(
            `Admin account was not created: ${errorMessage(err)} You can add it from the Admins page.`,
          );
        }
      }

      if (schoolId && form.deviceId) {
        try {
          await api.post('/api/devices', {
            deviceId: form.deviceId,
            licensePlate: form.licensePlate || undefined,
            schoolId,
          });
        } catch (err) {
          notes.push(
            `Device was not provisioned: ${errorMessage(err)} You can add it from the Devices page.`,
          );
        }
      }

      if (notes.length) {
        // Partial success: keep the dialog open so the operator sees exactly
        // what still needs doing rather than discovering it from a client call.
        setWarnings(notes);
        setForm((prev) => ({ ...prev, adminPassword: '' }));
      } else {
        onDone(`${form.name} is now on the platform.`);
        close();
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'A school with those details already exists.'
          : errorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a school"
      description="Only the school details are required. The admin and device steps are optional and can be done later."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="add-school-form" loading={submitting}>
            Add school
          </Button>
        </>
      }
    >
      <form id="add-school-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        {warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-warn-50 border border-warn-100 text-sm text-warn-700 space-y-1.5">
            <p className="font-semibold">The school was created, but not everything went through:</p>
            <ul className="list-disc pl-4 space-y-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <Button size="sm" variant="secondary" className="mt-2" onClick={close}>
              Close
            </Button>
          </div>
        )}

        <div className="grid sm:grid-cols-[1fr_10rem] gap-4">
          <TextField label="School name" required value={form.name} onChange={set('name')} />
          <SelectField
            label="Status"
            value={form.status}
            onChange={set('status')}
            hint="Pending hides it from active reporting."
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
            <TextField label="Street address" required value={form.address} onChange={set('address')} />
            <div className="grid sm:grid-cols-3 gap-4">
              <TextField label="City" required value={form.city} onChange={set('city')} />
              <TextField label="State" required value={form.state} onChange={set('state')} />
              <TextField
                label="Pincode"
                inputMode="numeric"
                value={form.pincode}
                onChange={set('pincode')}
                placeholder="110001"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={set('latitude')}
                placeholder="28.7041"
              />
              <TextField
                label="Longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={set('longitude')}
                placeholder="77.1025"
              />
            </div>
            <p className="text-xs text-slate-500">
              Coordinates draw the location map on the school's profile. Leave both blank if you
              don't have them yet — you can add them later from Edit profile.
            </p>
          </div>
        </fieldset>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">Primary contact</legend>
          <div className="space-y-4">
            <TextField
              label="Contact person"
              required
              value={form.contactPerson}
              onChange={set('contactPerson')}
              hint="The person you call about this school's fleet."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Their email"
                type="email"
                value={form.contactEmail}
                onChange={set('contactEmail')}
                placeholder="principal@school.edu.in"
              />
              <TextField
                label="Their phone"
                type="tel"
                value={form.contactPhone}
                onChange={set('contactPhone')}
                placeholder="+91 98765 43210"
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
                onChange={set('email')}
                placeholder="office@school.edu.in"
              />
              <TextField
                label="Office phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+91 11 2345 6789"
              />
            </div>
            <TextField
              label="Website"
              value={form.website}
              onChange={set('website')}
              placeholder="school.edu.in"
            />
          </div>
        </fieldset>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">Initial admin (optional)</legend>
          <div className="space-y-4">
            <TextField
              label="Admin name"
              value={form.adminName}
              onChange={set('adminName')}
              hint="Defaults to the contact person."
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Admin email"
                type="email"
                value={form.adminEmail}
                onChange={set('adminEmail')}
                placeholder="admin@school.edu.in"
              />
              <TextField
                label="Temporary password"
                type="password"
                autoComplete="new-password"
                value={form.adminPassword}
                onChange={set('adminPassword')}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="pt-4 border-t border-slate-100">
          <legend className="label mb-3">Initial device (optional)</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              label="Device ID"
              value={form.deviceId}
              onChange={set('deviceId')}
              placeholder="TM100-XXX"
            />
            <TextField
              label="License plate"
              value={form.licensePlate}
              onChange={set('licensePlate')}
              placeholder="DL1P-1234"
            />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
