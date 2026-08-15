import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Building2, Bus, Users, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Stats, School } from '../types';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [locations, setLocations] = useState<Record<string, {busId: string, lat: number, lng: number, speed: number, timestamp: string}>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const itemsPerPage = 5;
  const totalSchoolsPages = Math.ceil(schools.length / itemsPerPage) || 1;

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setStats(data));

    fetch((import.meta.env.VITE_API_URL || '') + '/api/schools', {
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

    fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/logs', {
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

    fetch((import.meta.env.VITE_API_URL || '') + '/api/devices/locations', {
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
    const socket = io(import.meta.env.VITE_API_URL || '', {
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
                {schools.slice((schoolsPage - 1) * itemsPerPage, schoolsPage * itemsPerPage).map((school) => (
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
                        {school.activeBuses || 0} Active
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
            <span>Showing {Math.min(schools.length, schoolsPage * itemsPerPage)} of {schools.length} schools</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setSchoolsPage(p => Math.max(1, p - 1))}
                disabled={schoolsPage === 1}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                &lt;
              </button>
              <button 
                onClick={() => setSchoolsPage(p => Math.min(totalSchoolsPages, p + 1))}
                disabled={schoolsPage === totalSchoolsPages}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
              >
                &gt;
              </button>
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
            <div className="w-full h-[300px] sm:h-[400px] bg-slate-800 rounded-lg relative overflow-hidden mb-4 border border-slate-700 z-0">
              <MapContainer 
                center={[28.7041, 77.1025]} 
                zoom={10} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {Object.values(locations).map((loc: any) => (
                  <Marker 
                    key={loc.busId} 
                    position={[loc.lat, loc.lng]}
                    icon={L.divIcon({
                      html: `<div style="background-color: ${loc.speed > 0 ? '#10b981' : '#f59e0b'}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>
                             </div>`,
                      className: '',
                      iconSize: [28, 28],
                      iconAnchor: [14, 14],
                    })}
                  >
                    <Popup className="text-slate-800">
                      <div className="font-bold border-b border-slate-100 pb-1 mb-1">{loc.serialNumber || loc.licensePlate || loc.busId}</div>
                      <div className="text-xs">Speed: {Math.round(loc.speed)} km/h</div>
                      {loc.schoolName && <div className="text-xs">School: {loc.schoolName}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">Last Update: {new Date(loc.timestamp).toLocaleTimeString()}</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
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
