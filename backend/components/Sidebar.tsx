
import React from 'react';
import { ICONS } from '../constants';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const adminItems = [
    { id: 'dashboard', label: 'Overview', icon: ICONS.Dashboard },
    { id: 'users', label: 'Moderation Queue', icon: ICONS.Users },
    { id: 'reviews', label: 'Reviews', icon: ICONS.Reviews },
    { id: 'trust-safety', label: 'Trust & Safety', icon: ICONS.Shield },
    { id: 'bookings', label: 'Audit Log', icon: ICONS.Bookings },
    { id: 'revenue', label: 'Ad Performance', icon: ICONS.Analytics },
  ];

  const userItems = [
    { id: 'browser', label: 'Find Services', icon: ICONS.Services },
    { id: 'my-bookings', label: 'My Inquiries', icon: ICONS.Chat },
    { id: 'profile', label: 'My Profile', icon: ICONS.Provider },
  ];

  const providerItems = [
    { id: 'provider-dashboard', label: 'Worker Dashboard', icon: ICONS.Dashboard },
    { id: 'my-bookings', label: 'Inbound Chats', icon: ICONS.Chat },
    { id: 'profile', label: 'Work Profile', icon: ICONS.Provider },
  ];

  const menuItems = userRole === UserRole.ADMIN ? adminItems : 
                   userRole === UserRole.PROVIDER ? providerItems : userItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl z-20">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center space-x-2 mb-10">
          <div className="w-10 h-10 bg-[#4FB584] rounded-xl flex items-center justify-center shadow-lg shadow-[#4FB584]/20">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tighter italic block leading-none">Helpado</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{userRole === UserRole.ADMIN ? 'Admin Console' : 'Marketplace'}</span>
          </div>
        </div>

        <nav className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-4">Workspace</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50">
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Network</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-300">Live Gateway</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
