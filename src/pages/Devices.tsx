import { useEffect, useState, FormEvent, useMemo } from 'react';
import { Cpu, Search, Filter, MoreVertical, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Device } from '../types';

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [formData, setFormData] = useState({ deviceId: '', serialNumber: '', licensePlate: '', schoolId: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  const deviceStats = useMemo(() => {
    const totalCount = devices.length;
    const activeCount = devices.filter(d => d.status === 'ONLINE').length;
    const totalErrorAlerts = devices.filter(d => d.status !== 'ONLINE').length;
    const percentageActive = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return {
      totalCount,
      activeCount,
      totalErrorAlerts,
      percentageActive
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (device.deviceId && device.deviceId.toLowerCase().includes(searchLower)) ||
        (device.serialNumber && device.serialNumber.toLowerCase().includes(searchLower)) ||
        (device.licensePlate && device.licensePlate.toLowerCase().includes(searchLower));

      const matchesStatus = selectedStatus === 'All Statuses' ||
        (device.status || 'OFFLINE') === selectedStatus.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [devices, selectedStatus, searchQuery]);

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + '/api/schools?limit=1000', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSchools(data.data || data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + `/api/devices?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setDevices(data);
          setTotalPages(1);
          setTotalCount(data.length);
        } else if (data.data) {
          setDevices(data.data);
          setTotalPages(Math.ceil(data.total / 50) || 1);
          setTotalCount(data.total);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching devices", err);
        setLoading(false);
      });
  }, [searchQuery, page]);

  const handleAddDevice = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newDevice = await res.json();
        if (newDevice.deviceSecret) {
          alert(`IMPORTANT: Save this device secret, it will only be shown once!\n\nDevice Secret: ${newDevice.deviceSecret}`);
        }
        setDevices([{...newDevice, school: schools.find(s => s.id === formData.schoolId)}, ...devices]);
        setIsModalOpen(false);
        setFormData({ deviceId: '', serialNumber: '', licensePlate: '', schoolId: '' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.issues) {
          alert((errorData.error || 'Validation failed') + ':\n' + errorData.issues.map((i: any) => i.message).join('\n'));
        } else {
          alert(errorData.error || 'Failed to provision device');
        }
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/devices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setDevices(devices.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">Hardware Devices</h1>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              {deviceStats.totalCount} TOTAL
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {deviceStats.percentageActive}% ACTIVE
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
              {deviceStats.totalErrorAlerts} ERRORS
            </span>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Provision Device
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="flex flex-col gap-1 w-48">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>All Statuses</option>
              <option>Online</option>
              <option>Offline</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 max-w-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Device ID or Serial..." 
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-auto">
            <button 
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-w-full flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Device ID</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serial Number</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned School</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bus License</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Ping</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No devices found.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-emerald-600 font-medium text-xs flex items-center gap-2 truncate max-w-[150px]">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      {device.deviceId}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-slate-600 text-xs truncate max-w-[150px]">
                      {device.licensePlate || device.serialNumber}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-800 font-medium truncate max-w-[150px]">
                      {device.school?.name || 'Unassigned'}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">
                      {device.licensePlate || '-'}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 font-medium">
                      <span className={device.status !== 'ONLINE' ? 'text-rose-600 font-bold' : ''}>
                        {device.lastPing || 'Never'}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase",
                        device.status === 'ONLINE' ? "bg-emerald-50 text-emerald-600" :
                        "bg-rose-50 text-rose-600"
                      )}>
                        {device.status || 'OFFLINE'}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-right">
                      <button 
                        onClick={() => handleDeleteDevice(device.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="Delete Device"
                      >
                        <span className="text-xs font-bold">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>Showing page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
            >
              &lt;
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 text-white font-medium">{page}</button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Provision Device</h2>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Device ID</label>
                <input required type="text" value={formData.deviceId} onChange={e => setFormData({...formData, deviceId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Serial Number (Optional)</label>
                <input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">License Plate (Optional)</label>
                <input type="text" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assign School (Optional)</label>
                <select value={formData.schoolId} onChange={e => setFormData({...formData, schoolId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Unassigned</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg">Provision</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
