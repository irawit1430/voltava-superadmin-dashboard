import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, GraduationCap, Cpu, Users, Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFleet } from '../context/FleetProvider';
import { relativeTime } from '../lib/format';

const LINKS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, end: true },
  { name: 'Live Map', href: '/map', icon: MapIcon, end: false },
  { name: 'Schools', href: '/schools', icon: GraduationCap, end: false },
  { name: 'Hardware Devices', href: '/devices', icon: Cpu, end: false },
  { name: 'Admins', href: '/admins', icon: Users, end: false },
  { name: 'Settings', href: '/settings', icon: Settings, end: false },
];

/**
 * Was a hardcoded "All Systems Operational" chip that stayed green while the
 * dashboard beside it showed twelve offline devices and an open SOS. It now
 * reports the live connection and the unresolved alert count.
 */
function SystemStatus() {
  const { connected, unresolvedCount, lastEventAt } = useFleet();

  const tone = !connected
    ? { dot: 'bg-danger-500', text: 'text-danger-300', bg: 'bg-danger-500/10' }
    : unresolvedCount > 0
      ? { dot: 'bg-warn-500', text: 'text-warn-300', bg: 'bg-warn-500/10' }
      : { dot: 'bg-ok-500', text: 'text-ok-300', bg: 'bg-ok-500/10' };

  const label = !connected
    ? 'Live connection down'
    : unresolvedCount > 0
      ? `${unresolvedCount} alert${unresolvedCount === 1 ? '' : 's'} open`
      : 'Live · all clear';

  return (
    <div className={cn('flex flex-col gap-1 px-3 py-2.5 rounded-md', tone.bg)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn('w-2 h-2 rounded-full shrink-0', tone.dot, connected && 'animate-pulse')}
          aria-hidden="true"
        />
        <span className={cn('text-xs font-semibold', tone.text)}>{label}</span>
      </div>
      {connected && lastEventAt && (
        <span className="text-[11px] text-slate-500 pl-[18px]">
          Last update {relativeTime(lastEventAt)}
        </span>
      )}
    </div>
  );
}

export function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        'w-64 bg-slate-900 text-slate-400 h-screen flex flex-col fixed left-0 top-0 shrink-0 z-50 transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
      aria-label="Main navigation"
    >
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-slate-900 font-black text-xl tracking-tighter">
            V
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-tight text-lg leading-tight">
              Voltava Drive
            </h1>
            <p className="text-[11px] uppercase text-brand-400 font-bold tracking-widest">
              Fleet Intelligence
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden ml-auto p-2 hover:bg-slate-800 rounded text-slate-300"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-4 flex flex-col gap-1 mt-2">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.href}
              end={link.end}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative',
                  isActive
                    ? 'bg-slate-800 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-r before:bg-brand-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('w-5 h-5 shrink-0', isActive ? 'text-brand-400' : 'text-slate-400')}
                    aria-hidden="true"
                  />
                  {link.name}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <SystemStatus />
      </div>
    </aside>
  );
}
