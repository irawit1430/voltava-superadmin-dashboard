/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui';

const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const LiveMap = React.lazy(() => import('./pages/LiveMap').then((m) => ({ default: m.LiveMap })));
const Alerts = React.lazy(() => import('./pages/Alerts').then((m) => ({ default: m.Alerts })));
const Schools = React.lazy(() => import('./pages/Schools').then((m) => ({ default: m.Schools })));
const SchoolProfile = React.lazy(() =>
  import('./pages/SchoolProfile').then((m) => ({ default: m.SchoolProfile })),
);
const Devices = React.lazy(() => import('./pages/Devices').then((m) => ({ default: m.Devices })));
const Admins = React.lazy(() => import('./pages/Admins').then((m) => ({ default: m.Admins })));
const Settings = React.lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
);

/**
 * Each route gets its own boundary, so a failure on one screen doesn't take the
 * shell — and therefore the navigation out of it — down with it.
 */
function Screen({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<LoadingSpinner />}>
        <div className="page-enter">{children}</div>
      </Suspense>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div className="max-w-md mx-auto my-16 text-center">
      <p className="label mb-2">Error 404</p>
      <h1 className="text-2xl font-bold text-slate-800">We couldn't find that page</h1>
      <p className="text-slate-600 mt-2">
        The link may be out of date, or the record may have been removed.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center h-10 px-4 mt-6 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Screen label="Dashboard"><Dashboard /></Screen>} />
            <Route path="map" element={<Screen label="Live map"><LiveMap /></Screen>} />
            <Route path="alerts" element={<Screen label="Alerts"><Alerts /></Screen>} />
            <Route path="schools" element={<Screen label="Schools"><Schools /></Screen>} />
            <Route
              path="schools/:id"
              element={<Screen label="School profile"><SchoolProfile /></Screen>}
            />
            <Route path="devices" element={<Screen label="Devices"><Devices /></Screen>} />
            <Route path="admins" element={<Screen label="Admins"><Admins /></Screen>} />
            <Route path="settings" element={<Screen label="Settings"><Settings /></Screen>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}
