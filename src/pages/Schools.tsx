import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Calendar, Filter, MoreVertical, HeartHandshake, ClipboardList, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import type { School } from '../types';

export function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', address: '', city: '', state: '', contactPerson: '',
    adminName: '', adminEmail: '', adminPassword: '',
    deviceId: '', licensePlate: ''
  });
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const activeSchools = schools.filter(s => s.status === 'Active').length;
  const pendingSchools = schools.filter(s => s.status === 'Pending').length;

  useEffect(() => {
    fetch(`/api/schools?page=${page}&limit=50&search=${encodeURIComponent(search)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // Handle pagination if API supports it (assuming data is either array or {data, total})
        if (Array.isArray(data)) {
          setSchools(data);
          setTotalPages(1);
          setTotalCount(data.length);
        } else if (data.data) {
          setSchools(data.data);
          setTotalPages(Math.ceil(data.total / 50) || 1);
          setTotalCount(data.total);
        }
      });
  }, [search, page]);

  const handleAddSchool = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          contactPerson: formData.contactPerson
        })
      });
      if (res.ok) {
        const newSchool = await res.json();
        const schoolId = newSchool.id || newSchool.data?.id;

        // Add Admin if provided
        if (formData.adminEmail && formData.adminPassword) {
          await fetch('/api/admins', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              name: formData.adminName || formData.contactPerson || 'School Admin',
              email: formData.adminEmail,
              password: formData.adminPassword,
              role: 'SCHOOL_ADMIN',
              schoolId
            })
          });
        }
        
        // Add Device if provided
        if (formData.deviceId) {
          await fetch('/api/devices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              deviceId: formData.deviceId,
              licensePlate: formData.licensePlate || 'Unassigned',
              serialNumber: '',
              schoolId
            })
          });
        }

        setIsModalOpen(false);
        setFormData({ 
          name: '', address: '', city: '', state: '', contactPerson: '',
          adminName: '', adminEmail: '', adminPassword: '',
          deviceId: '', licensePlate: ''
        });
        // Force refresh
        setPage(1);
        setSearch('');
        // We can just fetch the first page again
        const refreshRes = await fetch(`/api/schools?page=1&limit=50&search=`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const refreshData = await refreshRes.json();
        setSchools(refreshData.data || refreshData);
        if (refreshData.total) setTotalPages(Math.ceil(refreshData.total / 50) || 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      const res = await fetch(`/api/schools/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setSchools(schools.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">Schools Directory</h1>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">{totalCount} TOTAL</span>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New School
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Schools</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{totalCount}</h2>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Partnerships</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{activeSchools}</h2>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Verification</p>
            <div className="flex items-end gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{pendingSchools}</h2>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="flex flex-col gap-1 w-48">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 max-w-xs">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search schools..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-64">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Oct 01 - Oct 31, 2023" className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-auto">
            <button 
              onClick={() => { setSearch(''); setPage(1); }}
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
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">School ID</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">School Name</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">City / District</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Person</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Active Buses</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {schools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-slate-600 text-xs">
                    {school.id}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-800 font-medium flex items-center gap-3 truncate max-w-[150px]">
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center",
                      school.status === 'Active' ? "bg-emerald-50 text-emerald-600" :
                      school.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      <Building2 className="w-3 h-3" />
                    </div>
                    <Link to={`/schools/${school.id}`} className="hover:text-emerald-600 transition-colors">{school.name}</Link>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">{school.city}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">{school.contactPerson}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                    <span className="font-medium text-slate-800">{school.activeBuses}</span>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      school.status === 'Active' ? "bg-emerald-50 text-emerald-600" :
                      school.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {school.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-right">
                    <button 
                      onClick={() => handleDeleteSchool(school.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                      title="Delete School"
                    >
                      <span className="text-xs font-bold">Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
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
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Add New School</h2>
            <form onSubmit={handleAddSchool} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">School Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                <input required type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                  <input required type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Initial Admin (Optional)</h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Email</label>
                      <input type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="admin@school.com" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                      <input type="password" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Initial Device (Optional)</h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Device ID</label>
                      <input type="text" value={formData.deviceId} onChange={e => setFormData({...formData, deviceId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. TM100-XXX" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">License Plate</label>
                      <input type="text" value={formData.licensePlate} onChange={e => setFormData({...formData, licensePlate: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. DL1P-1234" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors rounded-lg">Add School</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
