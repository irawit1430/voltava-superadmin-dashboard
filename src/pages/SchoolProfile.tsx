import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Share, Edit2, Bus, Route, Users, MapPin, Mail, Phone, Globe, Info, MoreVertical, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '../lib/utils';
import type { School, Device } from '../types';

export function SchoolProfile() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', address: '', city: '', state: '', contactPerson: '' });

  const handleEditClick = () => {
    if (school) {
      setEditFormData({
        name: school.name || '',
        address: school.address || '',
        city: school.city || '',
        state: school.state || '',
        contactPerson: school.contactPerson || ''
      });
      setEditError(null);
      setIsEditModalOpen(true);
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEditError(null);
    
    try {
      const res = await fetch(`/api/schools/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updatedSchool = await res.json();
        setSchool({ ...school, ...editFormData, ...updatedSchool });
        setIsEditModalOpen(false);
      } else {
        console.error('Failed to update profile');
        setEditError('Failed to update profile on the server (500 Error). Please inform the backend team.');
      }
    } catch (err) {
      console.error(err);
      setEditError('Network error occurred while updating profile.');
    }
  };

  useEffect(() => {
    fetch('/api/schools', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then((data: any) => {
        const schoolsList = Array.isArray(data) ? data : data.data || [];
        const found = schoolsList.find((s: School) => s.id === id) || schoolsList[0];
        setSchool(found);
      });

    fetch('/api/devices', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const devicesList = Array.isArray(data) ? data : data.data || [];
        setDevices(devicesList.filter((d: any) => d.schoolId === id));
      });

    fetch(`/api/schools/${id}/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setStats(data));
  }, [id]);

  const activeCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.filter(d => d.status === 'OFFLINE').length;
  const totalCount = devices.length;
  const operationalPercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const fleetData = [
    { name: 'On-Duty (En Route)', value: activeCount, color: '#6366f1' }, // emerald-500
    { name: 'Offline / Maintenance', value: offlineCount, color: '#f59e0b' }, // amber-500
  ];

  if (!school) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-2">
        <Link to="/schools" className="hover:text-slate-900 transition-colors">Schools</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">{school.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-800">{school.name}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">
                Active
              </span>
            </div>
            <p className="text-slate-500 flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4" />
              1242 Education Plaza, {school.city}, {school.state} 62704
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors">
            <Share className="w-4 h-4" />
            Export Data
          </button>
          <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Buses</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Bus className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats?.totalBuses || 0}</h2>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Routes</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Route className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats?.totalRoutes || 0}</h2>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Users className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats?.totalStudents || 0}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">School Information</h3>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Principal</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold overflow-hidden">
                   <img src={`https://ui-avatars.com/api/?name=${(school.contactPerson || 'Unknown').replace(' ', '+')}&background=d1fae5&color=059669`} alt={school.contactPerson || 'N/A'} className="w-full h-full object-cover" />
                </div>
                <p className="font-medium text-slate-800">{school.contactPerson || 'N/A'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Contact Email</p>
                  <a href={`mailto:j.moore@${school.name.toLowerCase().replace(' ', '')}.edu`} className="text-emerald-600 hover:underline font-medium">
                    j.moore@{school.name.toLowerCase().replace(' ', '')}.edu
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Phone</p>
                  <p className="font-medium text-slate-800">+1 (217) 555-0192</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Website</p>
                  <a href={`https://www.${school.name.toLowerCase().replace(' ', '')}.edu`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">
                    www.{school.name.toLowerCase().replace(' ', '')}.edu
                  </a>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Location Overview</p>
              <div className="h-32 bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Map" className="w-full h-full object-cover opacity-50 grayscale" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-600 rounded-full border-2 border-white shadow flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voltava Devices Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Voltava Devices Status</h3>
            <button className="text-xs text-emerald-600 font-bold hover:underline">
              View Details
            </button>
          </div>
          <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {fleetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-2xl font-bold text-slate-800">{operationalPercent}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational</p>
              </div>
            </div>
            
            <div className="space-y-4 w-full max-w-xs">
              {fleetData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-slate-600 truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{item.value} / {totalCount}</span>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                 <div className="mt-0.5">
                   <Info className="w-4 h-4 text-amber-500" />
                 </div>
                 <p className="text-xs font-medium text-amber-800 leading-tight">
                   {offlineCount > 0 
                     ? `${offlineCount} buses require inspection.` 
                     : 'All buses are fully operational.'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Devices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Hardware Devices</h3>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            Assign New Device
          </button>
        </div>
        <div className="overflow-x-auto min-w-full flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Device ID</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serial Number</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Installation Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Ping</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-emerald-600 font-medium text-xs truncate max-w-[150px]">
                    {device.deviceId}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-slate-600 text-xs truncate max-w-[150px]">
                    {device.serialNumber}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 truncate max-w-[150px]">
                    {new Date(device.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600 font-medium">
                    <span className={device.status === 'OFFLINE' ? 'text-rose-600 font-bold' : ''}>
                      {device.lastPing}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      device.status === 'ONLINE' ? "bg-emerald-50 text-emerald-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-right">
                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>Showing {devices.length} devices</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">&lt;</button>
            <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">&gt;</button>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit School Profile</h2>
            {editError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm">
                {editError}
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">School Name</label>
                <input required type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                <input required type="text" value={editFormData.contactPerson} onChange={e => setEditFormData({...editFormData, contactPerson: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                <input required type="text" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input required type="text" value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                  <input required type="text" value={editFormData.state} onChange={e => setEditFormData({...editFormData, state: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
