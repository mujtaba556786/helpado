
import React, { useState, useMemo, useEffect } from 'react';
import { apiService, EMPTY_STATS } from './services/api';
import { User, Service, Booking, Review, UserRole, DashboardStats } from './types';
import DashboardView from './components/Dashboard';
import UserManagementView from './components/UserManagement';
import BookingManagementView from './components/BookingManagement';
import ReviewModerationView from './components/ReviewModeration';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import AdRevenueView from './components/AdRevenueView';
import AuthView from './components/AuthView';
import ServiceBrowserView from './components/ServiceBrowser';
import ProviderDashboardView from './components/ProviderDashboard';
import MyBookingsView from './components/MyBookings';
import UserProfileView from './components/UserProfileView';
import TrustSafetyView from './components/TrustSafety';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [u, s, b, st, rv] = await Promise.all([
        apiService.getUsers(),
        apiService.getServices(),
        apiService.getBookings(),
        apiService.getStats(),
        apiService.getReviews()
      ]);
      setUsers(u);
      setServices(s);
      setBookings(b);
      setStats(st);
      setReviews(rv);
    };
    if (currentUser) loadData();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === UserRole.ADMIN) setActiveTab('dashboard');
    else if (user.role === UserRole.PROVIDER) setActiveTab('provider-dashboard');
    else setActiveTab('browser');
  };

  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      // Admin Views
      case 'dashboard': return <DashboardView stats={stats} bookings={bookings} />;
      case 'users': return <UserManagementView users={users} setUsers={setUsers} />;
      case 'bookings': return <BookingManagementView bookings={bookings} setBookings={setBookings} />;
      case 'reviews': return <ReviewModerationView reviews={reviews} setReviews={setReviews} />;
      case 'trust-safety': return <TrustSafetyView />;
      case 'revenue': return <AdRevenueView stats={stats} />;
      
      // User/Provider Views
      case 'browser': return <ServiceBrowserView services={services} providers={users.filter(u => u.role === UserRole.PROVIDER && u.status === 'Active')} setBookings={setBookings} />;
      case 'provider-dashboard': return <ProviderDashboardView provider={currentUser} bookings={bookings.filter(b => b.providerId === currentUser.id)} setBookings={setBookings} />;
      case 'my-bookings': return <MyBookingsView bookings={bookings.filter(b => b.customerId === currentUser.id)} />;
      case 'profile': return <UserProfileView user={currentUser} onUpdate={setCurrentUser} />;
      
      default: return <DashboardView stats={stats} bookings={bookings} />;
    }
  };

  if (!currentUser) {
    return <AuthView onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={currentUser.role} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight">
              {activeTab === 'trust-safety' ? 'Trust & Safety' : activeTab === 'bookings' ? 'Audit Log' : activeTab.replace('-', ' ')}
            </h1>
            <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${currentUser.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'}`}>
              {currentUser.role} Control
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900 leading-none">{currentUser.name}</span>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentUser.email}</span>
             </div>
             <img src={currentUser.avatar} className="w-10 h-10 rounded-xl shadow-md border-2 border-white" alt="User" />
             <button onClick={() => setCurrentUser(null)} className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
             </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfe]">
          {renderContent()}
        </div>
        <AIAssistant context={{ stats, users, bookings }} />
      </main>
    </div>
  );
};

export default App;
