import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Menu,
  Search,
  LogOut,
  Loader2,
  Building2,
  Cpu,
  Users,
  AlertTriangle,
  X,
  ChevronDown,
  User,
} from 'lucide-react';
import { api, toPage, errorMessage } from '../lib/api';
import { useDebounced } from '../lib/useApi';
import { formatTime, humanise, relativeTime } from '../lib/format';
import { useFleet } from '../context/FleetProvider';
import { Avatar, Badge, Button, IconButton, useToast } from './ui';
import type { AuthUser, School, Device, Admin } from '../types';
import { cn } from '../lib/utils';

interface SearchResults {
  schools?: School[];
  devices?: Device[];
  admins?: Admin[];
}

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { notifications, unresolvedCount, resolveNotification, resolveAll, connected } = useFleet();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [resolvingAll, setResolvingAll] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const user = readUser();
  const displayName = user?.name || 'Admin';
  const displayRole = humanise(user?.role) || 'Super Admin';

  const debouncedQuery = useDebounced(searchQuery, 300);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  /* ---------------- search ---------------- */

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (!term) {
      setSearchResults(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setShowSearch(true);

    api
      .get<SearchResults>(`/api/search?q=${encodeURIComponent(term)}`, controller.signal)
      .then((data) => {
        setSearchResults(data ?? {});
        setSearchError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchResults(null);
        setSearchError(errorMessage(err));
      })
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
  };

  const hasResults =
    !!searchResults &&
    ((searchResults.schools?.length ?? 0) > 0 ||
      (searchResults.devices?.length ?? 0) > 0 ||
      (searchResults.admins?.length ?? 0) > 0);

  /* ---------------- notifications ---------------- */

  const onResolve = async (id: string) => {
    try {
      await resolveNotification(id);
    } catch (err) {
      toast.error('Could not resolve that alert', errorMessage(err));
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
    <header className="bg-white border-b border-slate-200 lg:ml-64 shrink-0 relative z-40">
      <div className="h-auto sm:h-16 py-3 sm:py-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-8 gap-3 sm:gap-6">
        <div className="flex items-center gap-3 w-full sm:max-w-xl">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-full" ref={searchRef}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={showSearch && (hasResults || !!searchError)}
              aria-controls="global-search-results"
              placeholder="Search schools, hardware, or admins…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearch(true);
              }}
              className="w-full h-10 pl-10 pr-10 bg-slate-100 border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
            {isSearching ? (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600 animate-spin"
                aria-hidden="true"
              />
            ) : searchQuery ? (
              <button
                onClick={closeSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-400 pointer-events-none select-none">
                <span className="text-[9px]">&#8984;</span>K
              </kbd>
            )}

            {showSearch && (searchResults || searchError) && (
              <div
                id="global-search-results"
                role="listbox"
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto"
              >
                {searchError ? (
                  <div className="p-4 text-sm text-danger-700 bg-danger-50">{searchError}</div>
                ) : !hasResults ? (
                  <div className="p-4 text-sm text-slate-600 text-center">
                    Nothing matches “{searchQuery}”.
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {!!searchResults?.schools?.length && (
                      <ResultGroup title="Schools">
                        {searchResults.schools.map((school) => (
                          <ResultRow
                            key={school.id}
                            to={`/schools/${school.id}`}
                            onNavigate={closeSearch}
                            icon={<Building2 className="w-4 h-4 text-brand-600" />}
                            iconClass="bg-brand-50"
                            title={school.name}
                            subtitle={[school.city, school.state].filter(Boolean).join(', ')}
                          />
                        ))}
                      </ResultGroup>
                    )}

                    {!!searchResults?.devices?.length && (
                      <ResultGroup title="Devices">
                        {searchResults.devices.map((device) => (
                          <ResultRow
                            key={device.id}
                            // Deep-linked: every device result used to point at
                            // the unfiltered /devices list, throwing away the
                            // match the search had just found.
                            to={`/devices?q=${encodeURIComponent(device.deviceId ?? device.id)}`}
                            onNavigate={closeSearch}
                            icon={<Cpu className="w-4 h-4 text-brand-600" />}
                            iconClass="bg-brand-50"
                            title={device.deviceId ?? device.serialNumber ?? device.id}
                            subtitle={
                              device.licensePlate
                                ? `${device.licensePlate}${device.school?.name ? ` · ${device.school.name}` : ''}`
                                : (device.school?.name ?? 'Unassigned')
                            }
                          />
                        ))}
                      </ResultGroup>
                    )}

                    {!!searchResults?.admins?.length && (
                      <ResultGroup title="Admins">
                        {searchResults.admins.map((admin) => (
                          <ResultRow
                            key={admin.id}
                            to={`/admins?q=${encodeURIComponent(admin.email ?? admin.name ?? '')}`}
                            onNavigate={closeSearch}
                            icon={<Users className="w-4 h-4 text-brand-600" />}
                            iconClass="bg-brand-50"
                            title={admin.name}
                            subtitle={`${humanise(admin.role)} · ${admin.email}`}
                          />
                        ))}
                      </ResultGroup>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((s) => !s)}
              aria-label={
                unresolvedCount > 0
                  ? `Alerts, ${unresolvedCount} unresolved`
                  : 'Alerts, none unresolved'
              }
              aria-expanded={showNotifications}
              className="relative text-slate-600 hover:bg-slate-100 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unresolvedCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-danger-600 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center tabular-nums">
                  {unresolvedCount > 9 ? '9+' : unresolvedCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-800">Alerts</h3>
                  {unresolvedCount > 0 && (
                    <Badge tone="danger">{unresolvedCount} open</Badge>
                  )}
                </div>

                {!connected && (
                  <p className="px-4 py-2 text-xs text-warn-700 bg-warn-50 border-b border-warn-100">
                    Live connection is down — this list refreshes every minute instead.
                  </p>
                )}

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-600">
                      No alerts right now.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((notif) => {
                        const resolved = (notif.status || '').toUpperCase() === 'RESOLVED';
                        const critical = (notif.type || '').toUpperCase().includes('SOS');
                        return (
                          <li
                            key={notif.id}
                            className={cn(
                              'p-4 hover:bg-slate-50 transition-colors flex gap-3',
                              resolved && 'opacity-55',
                            )}
                          >
                            <div
                              className={cn(
                                'mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                critical
                                  ? 'bg-danger-50 text-danger-600'
                                  : 'bg-warn-50 text-warn-600',
                              )}
                            >
                              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                              {notif.message && (
                                <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <p className="text-xs text-slate-500">
                                  {relativeTime(notif.createdAt)} · {formatTime(notif.createdAt)}
                                </p>
                                {!resolved && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-brand-700 hover:bg-brand-50"
                                    onClick={() => onResolve(notif.id)}
                                  >
                                    Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {unresolvedCount > 0 && (
                  <div className="p-3 border-t border-slate-100 flex justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={resolvingAll}
                      onClick={onResolveAll}
                      className="text-brand-700 hover:bg-brand-50"
                    >
                      Resolve all
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative sm:border-l sm:border-slate-200 sm:pl-4" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              aria-expanded={showUserMenu}
              aria-label="Account menu"
              className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <Avatar name={displayName} />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                  {displayRole}
                </p>
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden modal-enter">
                <div className="p-3 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 mb-1 label">{title}</div>
      {children}
    </div>
  );
}

function ResultRow({
  to,
  onNavigate,
  icon,
  iconClass,
  title,
  subtitle,
}: {
  to: string;
  onNavigate: () => void;
  icon: React.ReactNode;
  iconClass: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      role="option"
      aria-selected={false}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors"
    >
      <div
        className={cn('w-8 h-8 rounded flex items-center justify-center shrink-0', iconClass)}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
    </Link>
  );
}
