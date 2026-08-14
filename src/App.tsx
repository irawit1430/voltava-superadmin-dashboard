/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SchoolProfile } from './pages/SchoolProfile';
import { Login } from './pages/Login';
import { LoadingSpinner } from './components/LoadingSpinner';

const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Schools = React.lazy(() => import('./pages/Schools').then(module => ({ default: module.Schools })));
const Devices = React.lazy(() => import('./pages/Devices').then(module => ({ default: module.Devices })));
const Admins = React.lazy(() => import('./pages/Admins').then(module => ({ default: module.Admins })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<LoadingSpinner />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path="schools" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Schools />
            </Suspense>
          } />
          <Route path="schools/:id" element={<SchoolProfile />} />
          <Route path="devices" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Devices />
            </Suspense>
          } />
          <Route path="admins" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Admins />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Settings />
            </Suspense>
          } />
        </Route>
      </Routes>
    </Router>
  );
}
