import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { WifiOff, Wrench } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FleetProvider, useFleet } from '../context/FleetProvider';
import { SettingsProvider, useSettings } from '../context/SettingsProvider';

export function Layout() {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Providers live inside the auth gate — both need a token to do anything.
  return (
    <SettingsProvider>
      <FleetProvider>
        <LayoutShell />
      </FleetProvider>
    </SettingsProvider>
  );
}

/**
 * Banner for a dropped live connection. Without this the map simply freezes
 * while the UI keeps claiming it's live — the single most misleading state the
 * console can be in.
 */
function ConnectionBanner() {
  const { connected, connectionError } = useFleet();
  if (connected || !connectionError) return null;

  return (
    <div
      role="status"
      className="bg-danger-50 border-b border-danger-100 px-4 sm:px-8 py-2.5 flex items-center gap-2.5 text-sm text-danger-700"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        <b className="font-semibold">Live tracking is offline.</b> Vehicle positions on this screen
        are the last known values, not current ones.
      </span>
    </div>
  );
}

/** Maintenance mode was a switch that saved to the backend and changed nothing. */
function MaintenanceBanner() {
  const { settings } = useSettings();
  if (!settings.maintenanceMode) return null;

  return (
    <div
      role="status"
      className="bg-warn-50 border-b border-warn-100 px-4 sm:px-8 py-2.5 flex items-center gap-2.5 text-sm text-warn-700"
    >
      <Wrench className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        <b className="font-semibold">Maintenance mode is on.</b> School admins and drivers cannot
        sign in. Turn it off in Settings when you're done.
      </span>
    </div>
  );
}

function LayoutShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="lg:ml-64">
          <MaintenanceBanner />
          <ConnectionBanner />
        </div>
        <main id="main" className="flex-1 overflow-auto lg:ml-64 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
