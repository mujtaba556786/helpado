
import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { ICONS } from '../constants';
import { apiService } from '../services/api';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagementView: React.FC<UserManagementProps> = ({ users, setUsers }) => {
  const [activeView, setActiveView] = useState<'ALL' | 'PENDING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    bio: ''
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesView = activeView === 'PENDING' ? user.status === UserStatus.PENDING_APPROVAL : true;
    return matchesSearch && matchesView;
  });

  const handleApprove = async (id: string) => {
    const success = await apiService.approveUser(id);
    if (success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: UserStatus.ACTIVE } : u));
    }
  };

  const handleStatusChange = async (id: string, newStatus: UserStatus) => {
    const success = await apiService.updateUserStatus(id, newStatus);
    if (success) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
        const success = await apiService.updateUser(editingUser.id, formData);
        if (success) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } as User : u));
        }
    }
    closeModal();
  };

  const closeModal = () => {
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-200 rounded-2xl">
          <button onClick={() => setActiveView('ALL')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Directory</button>
          <button onClick={() => setActiveView('PENDING')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeView === 'PENDING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <span>Worker Requests</span>
            {users.filter(u => u.status === UserStatus.PENDING_APPROVAL).length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                    {users.filter(u => u.status === UserStatus.PENDING_APPROVAL).length}
                </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
            <div className="relative w-64">
               <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input placeholder="Search users..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#4FB584]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">System Privileges</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Engagement</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Orchestrate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center space-x-4">
                    <img src={user.avatar} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm" alt="" />
                    <div>
                        <p className="text-sm font-black text-slate-900 tracking-tight">{user.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-600">{user.role}</span>
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === UserStatus.ACTIVE ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                        <span className={`text-[10px] font-bold uppercase ${user.status === UserStatus.ACTIVE ? 'text-green-600' : 'text-amber-600'}`}>{user.status}</span>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-5 max-w-xs">
                    <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed font-medium">{user.bio || 'Profile bio not configured.'}</p>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center justify-end space-x-2">
                       {user.status === UserStatus.PENDING_APPROVAL && (
                           <>
                               <button onClick={() => handleStatusChange(user.id, UserStatus.BLOCKED)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-600 transition-colors">Reject</button>
                               <button onClick={() => handleApprove(user.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all">Approve</button>
                           </>
                       )}
                       <button 
                        onClick={() => openEditModal(user)}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="Manage User"
                       >
                           <ICONS.Settings className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Manage</span>
                       </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
            <div className="p-20 text-center">
                <ICONS.Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">No matching users found in {activeView.toLowerCase()} database.</p>
                <button onClick={() => { setSearchTerm(''); setActiveView('ALL'); }} className="mt-4 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">Clear Filters</button>
            </div>
        )}
      </div>

      {/* Orchestration Modal (Add/Edit) */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in duration-300">
                <div className="bg-indigo-600 p-10 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black italic tracking-tighter">
                            Account Audit
                        </h3>
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                            {`UID: ${editingUser?.id}`}
                        </p>
                    </div>
                    <button onClick={closeModal} className="relative z-10 p-3 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
                </div>

                <form onSubmit={handleSave} className="p-10 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Legal Name</label>
                            <input 
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-[#4FB584]/10 focus:border-indigo-600 transition-all"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Primary Email</label>
                            <input 
                                required
                                type="email"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-[#4FB584]/10 focus:border-indigo-600 transition-all"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                placeholder="email@domain.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Access Level</label>
                            <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-[#4FB584]/10 focus:border-indigo-600 transition-all appearance-none cursor-pointer"
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                            >
                                <option value={UserRole.CUSTOMER}>Customer</option>
                                <option value={UserRole.PROVIDER}>Worker / Provider</option>
                                <option value={UserRole.ADMIN}>System Admin</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Lifecycle Status</label>
                            <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-[#4FB584]/10 focus:border-indigo-600 transition-all appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as UserStatus})}
                            >
                                <option value={UserStatus.ACTIVE}>Active</option>
                                <option value={UserStatus.PENDING_APPROVAL}>Waiting Approval</option>
                                <option value={UserStatus.SUSPENDED}>Suspended</option>
                                <option value={UserStatus.BLOCKED}>Blacklisted</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Professional Bio / Notes</label>
                        <textarea 
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:ring-4 focus:ring-[#4FB584]/10 focus:border-indigo-600 transition-all h-28"
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                            placeholder="User biography or internal admin notes..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6">
                        <button type="button" onClick={closeModal} className="w-full py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black hover:bg-slate-200 transition-all">Cancel</button>
                        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                            Sync Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
