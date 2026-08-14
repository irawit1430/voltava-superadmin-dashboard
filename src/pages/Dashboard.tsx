import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Building2, Bus, Users, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import type { Stats, School } from '../types';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [locations, setLocations] = useState<Record<string, {busId: string, lat: number, lng: number, speed: number, timestamp: string}>>({});
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setStats(data));

    fetch('/api/schools', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSchools(data);
        } else if (data.data) {
          setSchools(data.data);
        }
      });

    fetch('/api/admin/logs', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data.data) {
          setLogs(data.data);
        }
      });

    fetch('/api/devices/locations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const initialLocations: Record<string, any> = {};
        if (Array.isArray(data)) {
          data.forEach((loc: any) => {
            initialLocations[loc.busId] = {
              busId: loc.busId,
              lat: loc.lastKnownLat || loc.lat,
              lng: loc.lastKnownLng || loc.lng,
              speed: loc.speed || 0,
              timestamp: loc.lastUpdate || loc.timestamp,
              licensePlate: loc.licensePlate || loc.serialNumber,
              schoolName: loc.schoolName
            };
          });
        }
        setLocations(initialLocations);
      });

    // Connect to WebSocket
    const socket = io({
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket']
    }); // Connects to the same origin by default

    socket.on('location_update', (data) => {
      console.log("Real-time Bus Moved:", data);
      setLocations(prev => ({
        ...prev,
        [data.busId]: data
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800">System Overview</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">REAL-TIME MONITORING</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Schools</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats?.totalSchools || '-'}</h2>
            {stats?.schoolsGrowthPercent != null && (
              <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium mb-1">
                <TrendingUp className="w-3 h-3" /> +{stats.schoolsGrowthPercent}%
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Buses Running</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Bus className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats?.totalBuses?.toLocaleString() || '-'}</h2>
            {stats?.busesGrowthPercent != null && (
              <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium mb-1">
                <TrendingUp className="w-3 h-3" /> +{stats.busesGrowthPercent}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offline GPS Devices</p>
            <div className="w-6 h-6 rounded bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-rose-600">{stats?.offlineDevices || '-'}</h2>
            <span className="text-rose-500 text-xs font-medium mb-1 px-1.5 py-0.5 bg-rose-50 rounded text-[10px] uppercase font-bold tracking-wide">Alert</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students Tracked</p>
            <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
              <Users className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-2xl font-bold text-slate-800">{stats ? stats.totalStudents.toLocaleString() : '-'}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recently Onboarded Schools</h3>
            <Link to="/schools" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              Directory
            </Link>
          </div>
          <div className="overflow-x-auto min-w-full flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">School ID</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">School Name</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Active Buses</th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {schools.slice(0, 5).map((school) => (
                  <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-emerald-600 font-medium text-xs">
                      <Link to={`/schools/${school.id}`} className="hover:underline">{school.id}</Link>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-800 font-medium flex items-center gap-2 truncate max-w-[150px]">
                      <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                      </div>
                      {school.name}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-slate-600">{school.city}, {school.state}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-center">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase">
                        {school.activeBuses} Active
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-right">
                      <Link to={`/schools/${school.id}`} className="text-xs text-emerald-600 font-bold hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
            <span>Showing {Math.min(schools.length, 5)} of {schools.length} schools</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">&lt;</button>
              <button className="p-1 rounded hover:bg-slate-200 disabled:opacity-50">&gt;</button>
            </div>
          </div>
        </div>

        {/* Live Network & System Logs */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Live Network Status</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">ONLINE</span>
            </div>
            <div className="w-full h-[300px] sm:h-[400px] bg-slate-800 rounded-lg relative overflow-hidden mb-4 border border-slate-700">
               {/* Map Placeholder styled to look like dark mode radar */}
               <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
               {Object.values(locations).map((loc: any) => (
                 <div key={loc.busId}>
                   <div 
                      className="absolute w-8 h-8 bg-emerald-500 rounded-full border-2 border-emerald-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] flex items-center justify-center z-10 transition-all duration-1000 ease-in-out"
                      style={{
                        top: `${50 + (loc.lat - 28.7041) * 10000}%`,
                        left: `${50 + (loc.lng - 77.1025) * 10000}%`
                      }}
                   >
                     <Bus className="w-4 h-4 text-white" />
                   </div>
                   <div 
                      className="absolute z-20 bg-slate-900 border border-slate-700 text-[10px] text-white px-2 py-1 rounded transition-all duration-1000 ease-in-out whitespace-nowrap"
                      style={{
                        top: `calc(${50 + (loc.lat - 28.7041) * 10000}% - 30px)`,
                        left: `calc(${50 + (loc.lng - 77.1025) * 10000}% - 20px)`
                      }}
                    >
                      {loc.serialNumber || loc.busId} • {Math.round(loc.speed)} km/h
                    </div>
                 </div>
               ))}
               
               {/* Static markers for context */}
               <div className="absolute top-1/3 left-1/3 w-4 h-4 bg-emerald-500 rounded-full border border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center z-10"></div>
               <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-amber-500 rounded-full border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center justify-center z-10"></div>
               <div className="absolute top-2/3 right-1/3 w-4 h-4 bg-rose-500 rounded-full border border-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.5)] flex items-center justify-center z-10 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Active</p>
                <p className="text-sm font-bold text-emerald-400">{stats?.activeDevices || 0}</p>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Stationary</p>
                <p className="text-sm font-bold text-amber-400">{stats?.stationaryDevices || 0}</p>
              </div>
              <div className="bg-rose-900/30 p-2 rounded border border-rose-800/50 text-center">
                <p className="text-[10px] text-rose-400 mb-0.5">Warning</p>
                <p className="text-sm font-bold text-rose-400">{stats?.warning || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">System Logs</h3>
            </div>
            <div className="p-4 space-y-4">
              {logs.length === 0 && <p className="text-sm text-slate-500">No recent logs.</p>}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${log.speed > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 leading-tight">
                      Bus {log.busId} ({log.bus?.licensePlate || log.serialNumber || 'Unknown'})
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {log.speed > 0 ? `Moving at ${log.speed} km/h` : 'Stationary'}.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
