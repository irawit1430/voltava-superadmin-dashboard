import { useEffect, useState, FormEvent } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

interface GlobalSettings {
  id: string;
  maintenanceMode: boolean;
  mapCenterLat: number;
  mapCenterLng: number;
  updatedAt: string;
}

export function Settings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [formData, setFormData] = useState({ maintenanceMode: false, mapCenterLat: 0, mapCenterLng: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then((data) => {
        setSettings(data);
        if (data) {
          setFormData({
            maintenanceMode: !!data.maintenanceMode,
            mapCenterLat: data.mapCenterLat,
            mapCenterLng: data.mapCenterLng
          });
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setMessage('Settings saved successfully.');
        // update settings state
        setSettings({ ...settings, ...formData, id: 'global', updatedAt: new Date().toISOString() } as GlobalSettings);
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setMessage('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="w-10 h-10 bg-emerald-50 flex items-center justify-center rounded-lg">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Global Settings</h1>
          <p className="text-sm text-slate-500">Configure application-wide parameters</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {message && (
            <div className={`p-3 text-sm rounded-lg ${message.includes('successfully') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">System Status</h2>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700">Maintenance Mode</label>
                <p className="text-xs text-slate-500">Disable access for non-admin users while performing updates.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.maintenanceMode} 
                  onChange={e => setFormData({...formData, maintenanceMode: e.target.checked})} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Default Map Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Center Latitude</label>
                <input 
                  required 
                  type="number" 
                  step="any"
                  value={formData.mapCenterLat} 
                  onChange={e => setFormData({...formData, mapCenterLat: parseFloat(e.target.value) || 0})} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Center Longitude</label>
                <input 
                  required 
                  type="number" 
                  step="any"
                  value={formData.mapCenterLng} 
                  onChange={e => setFormData({...formData, mapCenterLng: parseFloat(e.target.value) || 0})} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">These coordinates determine the initial viewport for all map interfaces.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
