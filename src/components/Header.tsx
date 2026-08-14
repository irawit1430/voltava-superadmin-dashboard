import { Bell, Menu, Search, LogOut, Loader2, Building2, Cpu, Users, AlertTriangle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Parse user from localStorage safely
  let user: any = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) user = JSON.parse(userStr);
  } catch (e) {
    console.error("Failed to parse user", e);
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleResolveNotification = (id: string) => {
    fetch(`/api/notifications/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'RESOLVED' } : n));
    }).catch(console.error);
  };

  const handleResolveAll = async () => {
    const unread = notifications.filter(n => n.status !== 'RESOLVED');
    if (unread.length === 0) return;

    const promises = unread.map(async (n) => {
      const res = await fetch(`/api/notifications/${n.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error(`Failed to resolve ${n.id}`);
      return n.id;
    });

    const results = await Promise.allSettled(promises);

    const successfulIds = new Set(
      results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value)
    );

    const hasFailures = results.some(r => r.status === 'rejected');

    setNotifications(prev =>
      prev.map(n => successfulIds.has(n.id) ? { ...n, status: 'RESOLVED' } : n)
    );

    if (hasFailures) {
      alert('Some notifications failed to resolve. Please try again.');
    }
  };

  const displayName = user?.name || 'Admin';
  const displayRole = user?.role ? user.role.replace('_', ' ') : 'Super Admin';

  const activeNotifs = notifications.filter(n => n.status !== 'RESOLVED');

  useEffect(() => {
    // Fetch notifications
    fetch('/api/notifications', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    setShowSearchDropdown(true);
    setIsSearching(true);
    
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setSearchResults(data);
        })
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <header className="h-auto sm:h-16 py-4 sm:py-0 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 lg:ml-64 shrink-0 relative z-40 gap-4 sm:gap-0">
      <div className="flex items-center w-full max-w-xl gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center w-full max-w-xl" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search schools, hardware, or admins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {isSearching && (
             <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
          )}
          
          {/* Search Dropdown */}
          {showSearchDropdown && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
              {(!searchResults.schools?.length && !searchResults.devices?.length && !searchResults.admins?.length) ? (
                <div className="p-4 text-sm text-slate-500 text-center">No results found for "{searchQuery}"</div>
              ) : (
                <div className="p-2 space-y-4">
                  {searchResults.schools?.length > 0 && (
                    <div>
                      <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Schools</div>
                      {searchResults.schools.map((school: any) => (
                        <Link 
                          key={school.id} 
                          to={`/schools/${school.id}`}
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                           <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0">
                             <Building2 className="w-4 h-4 text-emerald-600" />
                           </div>
                           <div>
                             <p className="text-sm font-medium text-slate-800">{school.name}</p>
                             <p className="text-xs text-slate-500">{school.city}, {school.state}</p>
                           </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.devices?.length > 0 && (
                    <div>
                      <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Devices</div>
                      {searchResults.devices.map((device: any) => (
                        <Link 
                          key={device.id} 
                          to={`/devices`}
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                           <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                             <Cpu className="w-4 h-4 text-blue-600" />
                           </div>
                           <div>
                             <p className="text-sm font-medium text-slate-800">{device.licensePlate}</p>
                             <p className="text-xs text-slate-500">{device.deviceId}</p>
                           </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.admins?.length > 0 && (
                    <div>
                      <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Admins</div>
                      {searchResults.admins.map((admin: any) => (
                        <Link 
                          key={admin.id} 
                          to={`/admins`}
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                           <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center flex-shrink-0">
                             <Users className="w-4 h-4 text-purple-600" />
                           </div>
                           <div>
                             <p className="text-sm font-medium text-slate-800">{admin.name}</p>
                             <p className="text-xs text-slate-500">{admin.role}</p>
                           </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      
      <div className="flex items-center justify-end w-full sm:w-auto gap-4 sm:gap-6">
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5" />
            {activeNotifs.length > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Notifications</h3>
                {activeNotifs.length > 0 && (
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{activeNotifs.length} New</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No new notifications.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${notif.status === 'RESOLVED' ? 'opacity-50' : ''}`}>
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notif.type === 'DRIVER_SOS' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            {notif.status !== 'RESOLVED' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResolveNotification(notif.id);
                                }}
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider px-2 py-0.5 bg-emerald-50 rounded"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {activeNotifs.length > 0 && (
                <div className="p-3 border-t border-slate-100 text-center">
                  <button 
                    onClick={handleResolveAll}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                  >
                    Mark All as Read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{displayRole}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
            <img src={`https://ui-avatars.com/api/?name=${displayName.replace(' ', '+')}&background=d1fae5&color=059669`} alt="Admin" className="w-full h-full object-cover" />
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
