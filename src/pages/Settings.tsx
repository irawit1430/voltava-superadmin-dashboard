import { useEffect, useState, type FormEvent } from 'react';
import { Settings as SettingsIcon, Save, Gauge, Map as MapIcon, Wrench, Bell } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useSettings, DEFAULT_SETTINGS } from '../context/SettingsProvider';
import type { GlobalSettings } from '../types';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  TextField,
  Toggle,
  ErrorBanner,
  Skeleton,
  useToast,
} from '../components/ui';

export function Settings() {
  const toast = useToast();
  const { settings, loading, error, applyLocal, reload } = useSettings();

  const [form, setForm] = useState<GlobalSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);

  useEffect(() => {
    if (!loading) setForm(settings);
  }, [loading, settings]);

  const persist = async (next: GlobalSettings) => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.put('/api/settings', next);
      applyLocal(next); // the app reacts immediately — map centre, banners, thresholds
      toast.success('Settings saved');
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    void persist(form);
  };

  const toggleMaintenance = (next: boolean) => {
    if (next) {
      // Turning this on cuts off every school admin and driver. It used to be a
      // one-click switch that also did nothing — now it does something, so it
      // asks first.
      setConfirmMaintenance(true);
    } else {
      const updated = { ...form, maintenanceMode: false };
      setForm(updated);
      void persist(updated);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-brand-50 flex items-center justify-center rounded-lg shrink-0">
          <SettingsIcon className="w-5 h-5 text-brand-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Global settings</h1>
          <p className="text-sm text-slate-600">Applies to every school on the platform</p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={`${error} Showing defaults until this loads.`}
          onRetry={reload}
        />
      )}
      {saveError && <ErrorBanner message={saveError} />}

      <Card>
        <CardHeader title="System status" />
        <div className="p-5">
          <Toggle
            label="Maintenance mode"
            description="Blocks sign-in for school admins and drivers while you deploy. Super admins keep access."
            checked={!!form.maintenanceMode}
            onChange={toggleMaintenance}
            tone="danger"
          />
        </div>
      </Card>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader
            title="Default map view"
            subtitle="Where every map opens before it frames the live fleet"
          />
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <TextField
                label="Centre latitude"
                type="number"
                step="any"
                required
                value={form.mapCenterLat ?? ''}
                onChange={(e) =>
                  setForm({ ...form, mapCenterLat: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="Centre longitude"
                type="number"
                step="any"
                required
                value={form.mapCenterLng ?? ''}
                onChange={(e) =>
                  setForm({ ...form, mapCenterLng: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="Default zoom"
                type="number"
                min={1}
                max={18}
                value={form.mapDefaultZoom ?? DEFAULT_SETTINGS.mapDefaultZoom}
                onChange={(e) =>
                  setForm({ ...form, mapDefaultZoom: parseInt(e.target.value, 10) || 10 })
                }
              />
            </div>
            <p className="text-sm text-slate-600 flex gap-2 items-start">
              <MapIcon className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              The dashboard map zooms to fit reporting vehicles when there are any. These
              coordinates are the fallback for an empty fleet.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Alert thresholds"
            subtitle="What the console treats as a problem"
          />
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Overspeed limit (km/h)"
                type="number"
                min={10}
                max={150}
                value={form.overspeedLimitKph ?? DEFAULT_SETTINGS.overspeedLimitKph}
                onChange={(e) =>
                  setForm({ ...form, overspeedLimitKph: parseInt(e.target.value, 10) || 0 })
                }
                hint="Above this, a vehicle is flagged as overspeeding."
              />
              <TextField
                label="Offline alert after (minutes)"
                type="number"
                min={5}
                max={720}
                value={form.offlineAlertMinutes ?? DEFAULT_SETTINGS.offlineAlertMinutes}
                onChange={(e) =>
                  setForm({ ...form, offlineAlertMinutes: parseInt(e.target.value, 10) || 0 })
                }
                hint="A device silent for longer than this counts as offline."
              />
            </div>
            <p className="text-sm text-slate-600 flex gap-2 items-start">
              <Gauge className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              These were previously hardcoded assumptions with no way to see or change them.
              Confirm the backend reads them before relying on them for alerting.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Alert delivery" />
          <div className="p-5 space-y-4">
            <TextField
              label="Alert email"
              type="email"
              value={form.alertEmail ?? ''}
              onChange={(e) => setForm({ ...form, alertEmail: e.target.value })}
              placeholder="ops@voltava.in"
              hint="Where SOS and offline alerts are sent when nobody is signed in."
            />
            <p className="text-sm text-slate-600 flex gap-2 items-start">
              <Bell className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              Alerts also appear in the bell menu, which refreshes live over the socket and falls
              back to a one-minute poll.
            </p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
            Save settings
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmMaintenance}
        onClose={() => setConfirmMaintenance(false)}
        title="Turn on maintenance mode?"
        tone="danger"
        confirmLabel="Turn on"
        body={
          <span className="flex gap-2 items-start">
            <Wrench className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            While this is on, school admins and drivers cannot sign in. Live tracking keeps
            running, but nobody outside your team can see it.
          </span>
        }
        onConfirm={async () => {
          const updated = { ...form, maintenanceMode: true };
          setForm(updated);
          await persist(updated);
        }}
      />
    </div>
  );
}
