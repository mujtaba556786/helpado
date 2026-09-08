
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User, UserRole, UserStatus } from '../types';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const ok = await apiService.adminLogin(password);

    if (ok) {
      const adminUser: User = {
        id: 'admin',
        name: 'Administrator',
        email: 'admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        onboarded: true,
        createdAt: new Date().toISOString(),
        avatar: '',
        provider: 'Email'
      };
      onLogin(adminUser);
    } else {
      setError('Incorrect password, or the server isn’t reachable.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-600 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 animate-in zoom-in duration-700">
        <div className="p-12 text-center">
          <div className="w-24 h-24 bg-[#4FB584] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-[#4FB584]/30 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
            <span className="text-white text-4xl font-black">H</span>
          </div>

          <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Helpado</h2>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Enterprise Administration</p>
              </div>

              <form onSubmit={(e) => handleLogin(e)} className="space-y-5">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Admin Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    autoFocus
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-[#4FB584]/20 focus:border-[#4FB584] font-bold transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs font-bold text-left ml-6">{error}</p>
                )}

                <button
                  disabled={loading || !password}
                  type="submit"
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Console'}
                </button>
              </form>
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 text-center w-full z-10">
        <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px] opacity-40">Helpado Ecosystem • Admin Console</p>
      </div>
    </div>
  );
};

export default AuthView;
