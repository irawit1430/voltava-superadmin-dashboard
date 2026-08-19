import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Plus, Trash2, Pencil, KeyRound, Search, X, ShieldCheck } from 'lucide-react';
import { api, toPage, query, errorMessage } from '../lib/api';
import { useApi, useDebounced } from '../lib/useApi';
import { humanise, relativeTime } from '../lib/format';
import type { Admin, School, AuthUser } from '../types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  IconButton,
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

const PAGE_SIZE = 25;

function currentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function Admins() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const me = currentUser();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const search = useDebounced(searchInput, 300);

  const [editing, setEditing] = useState<Admin | null>(null);
  const [isAddOpen, setAddOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Admin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [page, setPage] = useState(1);

  const admins = useApi(
    (signal) =>
      api
        .get<unknown>(`/api/admins${query({ search })}`, signal)
        .then((data) => toPage<Admin>(data)),
    [search],
  );

  const schools = useApi(
    (signal) =>
      api
        .get<unknown>(`/api/schools${query({ limit: 500 })}`, signal)
        .then((data) => toPage<School>(data)),
    [],
  );

  const schoolsById = useMemo(() => {
    const map = new Map<string, School>();
    for (const s of schools.data?.items ?? []) map.set(s.id, s);
    return map;
  }, [schools.data]);

  const items = admins.data?.items ?? [];
  // Counted over the full set on purpose: the "last super admin" guard below must
  // not go blind just because that account sits on another page.
  const superAdmins = items.filter((a) => a.role === 'SUPER_ADMIN');

  // Paginated on the client so the safety count above stays whole-set accurate.
  // clamp keeps the view from stranding on an empty page after a delete/search.
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /**
   * Nothing previously stopped an operator deleting their own account, or the
   * last remaining super admin — either of which locks everyone out of the
   * platform with no recovery short of direct database access.
   */
  const deleteBlockedReason = (admin: Admin): string | null => {
    if (me?.id && admin.id === me.id) {
      return 'This is the account you are signed in with. Sign in as another super admin to remove it.';
    }
    if (admin.role === 'SUPER_ADMIN' && superAdmins.length <= 1) {
      return 'This is the only super admin. Create another one before removing this account, or nobody will be able to sign in.';
    }
    return null;
  };

  const schoolLabel = (admin: Admin) => {
    if (admin.role === 'SUPER_ADMIN') return 'All schools';
    if (admin.school?.name) return admin.school.name;
    if (admin.schoolId) return schoolsById.get(admin.schoolId)?.name ?? admin.schoolId;
    return '—';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">Administrators</h1>
          {!admins.loading && <Badge tone="brand">{items.length} total</Badge>}
        </div>
        <Button onClick={() => setAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add admin
        </Button>
      </div>

      {superAdmins.length <= 1 && !admins.loading && items.length > 0 && (
        <ErrorBanner message="There is only one super admin account. If it's lost, nobody can sign in to this console — add a second one." />
      )}

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
            <label htmlFor="admin-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-search"
                type="search"
                placeholder="Name or email…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          {searchInput && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchInput('');
                setPage(1);
              }}
              icon={<X className="w-4 h-4" />}
            >
              Clear
            </Button>
          )}
        </div>

        {admins.error ? (
          <ErrorState message={admins.error} onRetry={admins.reload} />
        ) : (
          <>
            <DataTable>
              <thead className="border-b border-slate-200">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>School</Th>
                  <Th>Last sign-in</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.loading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : (
                  pageItems.map((admin) => {
                    const blocked = deleteBlockedReason(admin);
                    return (
                      <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                        <Td>
                          <CellInline icon={<Avatar name={admin.name} size="sm" />}>
                            <span className="font-medium text-slate-900">{admin.name}</span>
                          </CellInline>
                        </Td>
                        <Td className="text-slate-600">{admin.email}</Td>
                        <Td>
                          <Badge tone={admin.role === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>
                            {humanise(admin.role)}
                          </Badge>
                        </Td>
                        {/* Was the raw UUID. */}
                        <Td className="text-slate-600">{schoolLabel(admin)}</Td>
                        <Td className="text-slate-600">{relativeTime(admin.lastLoginAt)}</Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton label={`Edit ${admin.name}`} onClick={() => setEditing(admin)}>
                              <Pencil className="w-4 h-4" />
                            </IconButton>
                            <IconButton
                              label={`Reset password for ${admin.name}`}
                              onClick={() => setPasswordTarget(admin)}
                            >
                              <KeyRound className="w-4 h-4" />
                            </IconButton>
                            <IconButton
                              label={
                                blocked
                                  ? `Cannot delete ${admin.name}: ${blocked}`
                                  : `Delete ${admin.name}`
                              }
                              tone="danger"
                              disabled={!!blocked}
                              onClick={() => setDeleteTarget(admin)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </DataTable>

            <CardList>
              {pageItems.map((admin) => {
                const blocked = deleteBlockedReason(admin);
                return (
                  <CardRow
                    key={admin.id}
                    title={admin.name}
                    subtitle={admin.email}
                    badge={
                      <Badge tone={admin.role === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>
                        {humanise(admin.role)}
                      </Badge>
                    }
                    rows={[
                      { label: 'School', value: schoolLabel(admin) },
                      { label: 'Last sign-in', value: relativeTime(admin.lastLoginAt) },
                    ]}
                    actions={
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(admin)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPasswordTarget(admin)}
                        >
                          Reset password
                        </Button>
                        {!blocked && (
                          <Button
                            size="sm"
                            variant="dangerGhost"
                            onClick={() => setDeleteTarget(admin)}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    }
                  />
                );
              })}
            </CardList>

            {!admins.loading && items.length === 0 && (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title={search ? 'No admins match that search' : 'No admins yet'}
                body={
                  search
                    ? 'Try a different name or email.'
                    : 'Add the first administrator account for this platform.'
                }
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    Add admin
                  </Button>
                }
              />
            )}

            {total > 0 && (
              <Pagination
                page={safePage}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                noun="admins"
              />
            )}
          </>
        )}
      </Card>

      <AdminFormModal
        open={isAddOpen || !!editing}
        admin={editing}
        schools={schools.data?.items ?? []}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={(message) => {
          toast.success(message);
          admins.reload();
        }}
      />

      <PasswordResetModal
        admin={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSaved={() => toast.success('Password updated', 'Share the new password securely.')}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? 'admin'}?`}
        body={`${deleteTarget?.email} will lose access immediately.`}
        confirmLabel="Delete admin"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/api/admins/${deleteTarget.id}`);
          toast.success(`${deleteTarget.name} removed`);
          admins.reload();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Create and edit. Editing did not exist before — the documented
 * `PUT /api/admins/:id` was never called from the UI, so the only remedy for a
 * wrong name or a changed school was delete-and-recreate, which changes the ID.
 */
function AdminFormModal({
  open,
  admin,
  schools,
  onClose,
  onSaved,
}: {
  open: boolean;
  admin: Admin | null;
  schools: School[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!admin;
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPER_ADMIN',
    schoolId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);

  // Seed from the record being edited, once per open.
  const seedKey = admin?.id ?? (open ? 'new' : null);
  if (open && seedKey !== seeded) {
    setSeeded(seedKey);
    setForm({
      name: admin?.name ?? '',
      email: admin?.email ?? '',
      password: '',
      role: admin?.role ?? 'SUPER_ADMIN',
      schoolId: admin?.schoolId ?? '',
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
    if (submitting) return;

    if (form.role === 'SCHOOL_ADMIN' && !form.schoolId) {
      setError('Pick the school this admin belongs to.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && admin) {
        await api.put(`/api/admins/${admin.id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
          schoolId: form.role === 'SCHOOL_ADMIN' ? form.schoolId : null,
        });
        onSaved(`${form.name} updated`);
      } else {
        await api.post('/api/admins', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          schoolId: form.role === 'SCHOOL_ADMIN' ? form.schoolId : undefined,
        });
        onSaved(`${form.name} added`);
      }
      close();
    } catch (err) {
      // Previously a failed create just left the modal sitting there with no
      // indication that anything had gone wrong.
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? `Edit ${admin?.name}` : 'Add administrator'}
      description={
        isEdit ? 'Password changes are handled separately.' : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="admin-form" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add admin'}
          </Button>
        </>
      }
    >
      <form id="admin-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <TextField
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextField
          label="Email"
          type="email"
          required
          autoComplete="off"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {!isEdit && (
          <TextField
            label="Temporary password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Share it securely. They should change it after signing in."
          />
        )}

        <SelectField
          label="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          hint={
            form.role === 'SUPER_ADMIN'
              ? 'Full access to every school and this console.'
              : 'Access limited to one school.'
          }
        >
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="SCHOOL_ADMIN">School Admin</option>
        </SelectField>

        {form.role === 'SCHOOL_ADMIN' && (
          /* Was a free-text field that required pasting a raw UUID, while the
             Devices page already solved the same problem with a dropdown. */
          <SelectField
            label="School"
            required
            value={form.schoolId}
            onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
          >
            <option value="">Select a school…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.city ? ` — ${s.city}` : ''}
              </option>
            ))}
          </SelectField>
        )}
      </form>
    </Modal>
  );
}

/** "School admin forgot their password" had no remedy in the console at all. */
function PasswordResetModal({
  admin,
  onClose,
  onSaved,
}: {
  admin: Admin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPassword('');
    setConfirm('');
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !admin) return;
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/api/admins/${admin.id}`, { password });
      onSaved();
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!admin}
      onClose={close}
      title={`Reset password for ${admin?.name ?? ''}`}
      description="They will need to sign in again with the new password."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="password-form" loading={submitting}>
            Set password
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Send the new password over a channel the account holder controls — not the email
            address you are resetting.
          </p>
        </div>
        <TextField
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </form>
    </Modal>
  );
}
