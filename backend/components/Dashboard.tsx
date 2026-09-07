
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DashboardStats, Booking } from '../types';
import { ICONS } from '../constants';
import { apiService } from '../services/api';

interface DashboardProps {
  stats: DashboardStats;
  bookings: Booking[];
}

const DashboardView: React.FC<DashboardProps> = ({ stats, bookings }) => {
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, { status: string, time: string, data?: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const recentInquiries = bookings.slice(0, 5);

  const runDiagnostic = async (label: string, fetchFn: () => Promise<any>) => {
    setTesting(label);
    const start = performance.now();
    try {
      const data = await fetchFn();
      const end = performance.now();
      setDiagnosticResults(prev => ({
        ...prev,
        [label]: { 
          status: 'SUCCESS', 
          time: `${Math.round(end - start)}ms`,
          data: JSON.stringify(data).substring(0, 50) + '...'
        }
      }));
    } catch (err) {
      setDiagnosticResults(prev => ({
        ...prev,
        [label]: { status: 'FAILED', time: 'N/A', data: 'Server Unreachable' }
      }));
    }
    setTesting(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={ICONS.Users} color="bg-blue-500" />
        <StatCard title="Ad Impressions" value={stats.adImpressions.toLocaleString()} icon={ICONS.Analytics} color="bg-indigo-500" />
        <StatCard title="Active Inquiries" value={stats.pendingInquiries.toString()} icon={ICONS.Chat} color="bg-emerald-500" />
        <StatCard title="Avg User Rating" value={stats.averageRating.toString()} icon={ICONS.Reviews} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">User Engagement (Messages)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.engagementData}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                   contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Inquiries */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Conversations</h3>
          <div className="space-y-4">
            {recentInquiries.map((booking) => (
              <div key={booking.id} className="flex items-center space-x-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">
                  {booking.serviceName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{booking.customerName}</p>
                  <p className="text-xs text-slate-500">{booking.serviceName}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-wider text-indigo-600`}>Active Chat</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            View Analytics
          </button>
        </div>
      </div>

      {/* API Diagnostic Tool */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight leading-none">Endpoint Diagnostics</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Live backend verification &middot; same-origin /api</p>
                </div>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Run a check below</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DiagnosticItem 
                label="USERS API" 
                endpoint="/api/users" 
                testing={testing === 'USERS'}
                result={diagnosticResults['USERS']}
                onTest={() => runDiagnostic('USERS', apiService.getUsers)} 
            />
            <DiagnosticItem 
                label="STATS API" 
                endpoint="/api/stats" 
                testing={testing === 'STATS'}
                result={diagnosticResults['STATS']}
                onTest={() => runDiagnostic('STATS', apiService.getStats)} 
            />
            <DiagnosticItem 
                label="SERVICES API" 
                endpoint="/api/services" 
                testing={testing === 'SERVICES'}
                result={diagnosticResults['SERVICES']}
                onTest={() => runDiagnostic('SERVICES', apiService.getServices)} 
            />
            <DiagnosticItem 
                label="BOOKINGS API" 
                endpoint="/api/bookings" 
                testing={testing === 'BOOKINGS'}
                result={diagnosticResults['BOOKINGS']}
                onTest={() => runDiagnostic('BOOKINGS', apiService.getBookings)} 
            />
        </div>

        <div className="mt-8 p-4 bg-black/40 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">How this works</p>
            <p className="text-xs text-slate-400 font-medium">The panel is served by the API itself and calls <code className="text-emerald-400">/api</code> on the same origin. There is no mock fallback: if a request fails you will see the failure here and the affected view will be empty rather than showing invented data.</p>
        </div>
      </div>
    </div>
  );
};

const DiagnosticItem = ({ label, endpoint, onTest, testing, result }: any) => (
    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-colors group">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-[9px] font-bold text-slate-500">{endpoint}</p>
            </div>
            <button 
                onClick={onTest}
                disabled={testing}
                className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
                {testing ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
            </button>
        </div>
        
        {result ? (
            <div className="space-y-1 animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${result.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className={`text-[10px] font-black uppercase ${result.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}`}>{result.status}</span>
                    <span className="text-[9px] font-bold text-slate-600">{result.time}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">{result.data}</p>
            </div>
        ) : (
            <p className="text-[10px] text-slate-600 font-bold italic">Waiting for verification...</p>
        )}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-indigo-200 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-emerald-500 text-xs font-bold">+5.2%</span>
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
    </div>
  </div>
);

export default DashboardView;
