import { useMemo, useState } from 'react';
import {
  Bell,
  Siren,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { useFleet } from '../context/FleetProvider';
import { relativeTime, formatTime, formatDate } from '../lib/format';
import { errorMessage } from '../lib/api';
import type { Notification } from '../types';
import {
  Badge,
  Button,
  Card,
  IconButton,
  KpiCard,
  Pagination,
  SelectField,
  DataTable,
  Th,
  Td,
  CardList,
  CardRow,
  EmptyState,
  useToast,
  type Tone,
} from '../components/ui';
import { cn } from '../lib/utils';

const PAGE_SIZE = 20;

type Severity = 'critical' | 'danger' | 'warn' | 'info';

/**
 * The backend does not send a normalised severity, only a free-text `type`
 * ("SOS", "OVERSPEED", …) whose casing isn't guaranteed. This maps that noisy
 * string onto the four semantic levels the UI actually colours by, so an SOS is
 * always critical no matter how the field is spelled — and an unknown type
 * degrades to `info` rather than vanishing.
 */
function severityOf(type?: string | null): Severity {
  const t = (type || '').toUpperCase();
  if (t.includes('SOS') || t.includes('PANIC') || t.includes('EMERGENCY')) return 'critical';
  if (t.includes('OVERSPEED') || t.includes('SPEED') || t.includes('CRASH') || t.includes('ACCIDENT'))
    return 'danger';
  if (
    t.includes('OFFLINE') ||
    t.includes('SILENT') ||
    t.includes('GEOFENCE') ||
    t.includes('BATTERY') ||
    t.includes('IDLE') ||
    t.includes('STOP')
  )
    return 'warn';
  return 'info';
}

const SEVERITY_META: Record<
  Severity,
  {
    label: string;
    tone: Tone;
    icon: typeof Bell;
    rank: number;
    /** Literal classes — Tailwind can't see `bg-${tone}-50` built at runtime. */
    circle: string;
  }
> = {
  critical: {
    label: 'Critical',
    tone: 'critical',
    icon: Siren,
    rank: 3,
    circle: 'bg-critical-50 text-critical-600',
  },
  danger: {
    label: 'Danger',
    tone: 'danger',
    icon: AlertTriangle,
    rank: 2,
    circle: 'bg-danger-50 text-danger-600',
  },
  warn: {
    label: 'Warning',
    tone: 'warn',
    icon: AlertCircle,
    rank: 1,
    circle: 'bg-warn-50 text-warn-600',
  },
  info: {
    label: 'Info',
    tone: 'info',
    icon: Info,
    rank: 0,
    circle: 'bg-info-50 text-info-600',
  },
};

const SEVERITY_FILTERS = ['All severities', 'Critical', 'Danger', 'Warning', 'Info'] as const;
const STATUS_FILTERS = ['Open', 'Resolved', 'All'] as const;

function isResolved(n: Notification) {
  return (n.status || '').toUpperCase() === 'RESOLVED';
}

export function Alerts() {
  const toast = useToast();
  const {
    notifications,
    unresolvedCount,
    resolveNotification,
    resolveAll,
    connected,
    lastEventAt,
    refresh,
  } = useFleet();

  const [searchInput, setSearchInput] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITY_FILTERS)[number]>('All severities');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('Open');
  const [page, setPage] = useState(1);
  const [resolvingAll, setResolvingAll] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const criticalOpen = notifications.filter(
    (n) => !isResolved(n) && severityOf(n.type) === 'critical',
  ).length;
  const resolvedCount = notifications.filter(isResolved).length;

  const filtered = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return notifications
      .filter((n) => {
        if (statusFilter === 'Open' && isResolved(n)) return false;
        if (statusFilter === 'Resolved' && !isResolved(n)) return false;

        if (severity !== 'All severities') {
          const want = severity.toLowerCase();
          const sev = severityOf(n.type);
          const label = SEVERITY_META[sev].label.toLowerCase();
          if (label !== want) return false;
        }

        if (!term) return true;
        return [n.title, n.message, n.type]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term));
      })
      // Most urgent first, then most recent — an SOS never sits below an
      // offline notice just because the notice arrived later.
      .sort((a, b) => {
        const ra = SEVERITY_META[severityOf(a.type)].rank;
        const rb = SEVERITY_META[severityOf(b.type)].rank;
        if (ra !== rb) return rb - ra;
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [notifications, searchInput, severity, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filtersActive =
    !!searchInput || severity !== 'All severities' || statusFilter !== 'Open';

  const resetFilters = () => {
    setSearchInput('');
    setSeverity('All severities');
    setStatusFilter('Open');
    setPage(1);
  };

  const onResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveNotification(id);
    } catch (err) {
      toast.error('Could not resolve that alert', errorMessage(err));
    } finally {
      setResolvingId(null);
    }
  };

  const onResolveAll = async () => {
    setResolvingAll(true);
    try {
      const { resolved, failed } = await resolveAll();
      if (failed > 0) {
        toast.error(
          `${failed} alert${failed === 1 ? '' : 's'} could not be resolved`,
          `${resolved} went through. Try the rest again.`,
        );
      } else if (resolved > 0) {
        toast.success(`Resolved ${resolved} alert${resolved === 1 ? '' : 's'}`);
      }
    } finally {
      setResolvingAll(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">Alerts</h1>
          {unresolvedCount > 0 ? (
            <Badge tone={criticalOpen > 0 ? 'critical' : 'danger'} dot>
              {unresolvedCount} open
            </Badge>
          ) : (
            <Badge tone="ok" dot>
              All clear
            </Badge>
          )}
          {connected ? (
            <span className="text-xs text-slate-500 tabular-nums">
              {lastEventAt ? `live · updated ${relativeTime(lastEventAt)}` : 'live'}
            </span>
          ) : (
            <Badge tone="warn">Feed down · polling</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={refresh}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          {unresolvedCount > 0 && (
            <Button
              variant="critical"
              loading={resolvingAll}
              onClick={onResolveAll}
              icon={<Check className="w-4 h-4" />}
            >
              Resolve all
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Open alerts"
          value={unresolvedCount}
          icon={<Bell className="w-3.5 h-3.5" />}
          tone={criticalOpen > 0 ? 'critical' : unresolvedCount > 0 ? 'danger' : 'neutral'}
          basis="Awaiting acknowledgement"
        />
        <KpiCard
          label="SOS / critical open"
          value={criticalOpen}
          icon={<Siren className="w-3.5 h-3.5" />}
          tone={criticalOpen > 0 ? 'critical' : 'neutral'}
          basis="Life-safety — handle first"
        />
        <KpiCard
          label="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          tone="ok"
          basis="Within the loaded history"
        />
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number]);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-40"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>

          <SelectField
            label="Severity"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as (typeof SEVERITY_FILTERS)[number]);
              setPage(1);
            }}
            wrapperClassName="w-full sm:w-44"
          >
            {SEVERITY_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
            <label htmlFor="alert-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="alert-search"
                type="search"
                placeholder="Title, message, or type…"
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
            <Button variant="ghost" onClick={resetFilters} icon={<X className="w-4 h-4" />}>
              Clear
            </Button>
          )}
        </div>

        {total === 0 ? (
          <AlertsEmpty
            hasAny={notifications.length > 0}
            filtersActive={filtersActive}
            onClear={resetFilters}
            onViewAll={() => {
              setStatusFilter('All');
              setSeverity('All severities');
              setSearchInput('');
              setPage(1);
            }}
          />
        ) : (
          <>
            <DataTable>
              <thead className="border-b border-slate-200">
                <tr>
                  <Th>Alert</Th>
                  <Th>Severity</Th>
                  <Th>Raised</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((n) => {
                  const sev = severityOf(n.type);
                  const meta = SEVERITY_META[sev];
                  const Icon = meta.icon;
                  const resolved = isResolved(n);
                  const critical = sev === 'critical' && !resolved;
                  return (
                    <tr
                      key={n.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors',
                        critical && 'bg-critical-50/40',
                        resolved && 'opacity-60',
                      )}
                    >
                      <Td>
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={cn(
                              'mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                              meta.circle,
                              critical && 'pulse-critical',
                            )}
                            aria-hidden="true"
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 break-words">
                              {n.title || 'Alert'}
                            </p>
                            {n.message && (
                              <p className="text-sm text-slate-600 mt-0.5 break-words">
                                {n.message}
                              </p>
                            )}
                            {n.type && (
                              <p className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mt-0.5">
                                {n.type}
                              </p>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="text-sm text-slate-700">{relativeTime(n.createdAt)}</span>
                        <span className="block text-xs text-slate-400 tabular-nums">
                          {formatDate(n.createdAt)} · {formatTime(n.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        {resolved ? (
                          <Badge tone="neutral">Resolved</Badge>
                        ) : (
                          <Badge tone="warn" dot>
                            Open
                          </Badge>
                        )}
                      </Td>
                      <Td align="right">
                        {resolved ? (
                          <span className="text-slate-300" aria-hidden="true">
                            <Check className="w-4 h-4 inline" />
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={resolvingId === n.id}
                            onClick={() => onResolve(n.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>

            <CardList>
              {pageItems.map((n) => {
                const sev = severityOf(n.type);
                const meta = SEVERITY_META[sev];
                const resolved = isResolved(n);
                return (
                  <CardRow
                    key={n.id}
                    title={n.title || 'Alert'}
                    subtitle={n.message || undefined}
                    badge={
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    }
                    rows={[
                      { label: 'Raised', value: relativeTime(n.createdAt) },
                      {
                        label: 'Status',
                        value: resolved ? 'Resolved' : 'Open',
                      },
                    ]}
                    actions={
                      resolved ? undefined : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          loading={resolvingId === n.id}
                          onClick={() => onResolve(n.id)}
                        >
                          Resolve
                        </Button>
                      )
                    }
                  />
                );
              })}
            </CardList>

            <Pagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              noun="alerts"
            />
          </>
        )}
      </Card>
    </div>
  );
}

function AlertsEmpty({
  hasAny,
  filtersActive,
  onClear,
  onViewAll,
}: {
  hasAny: boolean;
  filtersActive: boolean;
  onClear: () => void;
  onViewAll: () => void;
}) {
  // No alerts have ever come in.
  if (!hasAny) {
    return (
      <EmptyState
        icon={<Bell className="w-5 h-5" />}
        title="No alerts yet"
        body="SOS, overspeed, and offline-device alerts from the fleet will appear here as they come in."
      />
    );
  }
  // There are alerts, but the current filters exclude them all. The common case
  // is "Open" with nothing open — which is good news, so say so.
  return (
    <EmptyState
      icon={<CheckCircle2 className="w-5 h-5" />}
      title={filtersActive ? 'Nothing matches these filters' : 'No open alerts'}
      body={
        filtersActive
          ? 'Widen the search, severity, or status to see more.'
          : 'Every alert has been resolved. You can still browse the history.'
      }
      action={
        filtersActive ? (
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onViewAll}>
            View resolved history
          </Button>
        )
      }
    />
  );
}
