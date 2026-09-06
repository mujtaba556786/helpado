
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User, UserRole, UserStatus } from '../types';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'ONBOARDING' | 'PENDING'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingBio, setOnboardingBio] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

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
      setUser(adminUser);
      onLogin(adminUser);
    } else {
      setError('Incorrect password, or the server isn’t reachable.');
    }
    setLoading(false);
  };

  // Fixed: Implemented missing handleCompleteOnboarding function
  const handleCompleteOnboarding = async () => {
    if (!user || !onboardingName || !selectedRole) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const result = await apiService.completeOnboarding(
      user.id,
      onboardingName,
      selectedRole,
      onboardingBio
    );

    if (result && result.success) {
      const updatedUser: User = {
        ...user,
        name: onboardingName,
        role: selectedRole,
        bio: onboardingBio,
        onboarded: true,
        status: result.status as UserStatus
      };
      setUser(updatedUser);

      if (result.status === UserStatus.PENDING_APPROVAL) {
        setStep('PENDING');
      } else {
        onLogin(updatedUser);
      }
    } else {
      alert("Failed to complete profile onboarding.");
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
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-600/30 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
            <span className="text-white text-4xl font-black italic">S</span>
          </div>

          {step === 'LOGIN' && (
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
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold transition-all"
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
          )}

          {step === 'ONBOARDING' && (
            <div className="space-y-6 animate-in zoom-in">
              <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">Identity Setup</h2>
              <p className="text-slate-500 text-sm font-medium">Finalize your profile to enter the marketplace.</p>
              <div className="space-y-4 text-left">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                    <input placeholder="Ex: Alice Smith" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={onboardingName} onChange={e => setOnboardingName(e.target.value)} />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Primary Goal</label>
                    <div className="flex space-x-2">
                        <button onClick={() => setSelectedRole(UserRole.CUSTOMER)} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${selectedRole === UserRole.CUSTOMER ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>Hire Service</button>
                        <button onClick={() => setSelectedRole(UserRole.PROVIDER)} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${selectedRole === UserRole.PROVIDER ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>Provide Service</button>
                    </div>
                 </div>

                 {selectedRole === UserRole.PROVIDER && (
                   <div className="space-y-1 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Worker Bio</label>
                    <textarea placeholder="Tell us what you can do... (Pending admin review)" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium h-24 text-sm" value={onboardingBio} onChange={e => setOnboardingBio(e.target.value)} />
                   </div>
                 )}

                 <button onClick={handleCompleteOnboarding} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-600/20 mt-6 transform hover:scale-[1.02] transition-transform">
                   {selectedRole === UserRole.PROVIDER ? 'Submit Worker Application' : 'Enter Marketplace'}
                 </button>
              </div>
            </div>
          )}

          {step === 'PENDING' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8">
              <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-2xl rotate-12">🔒</div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Verification Pending</h2>
                <p className="text-slate-500 font-medium mt-4 leading-relaxed px-4">
                  As a new <span className="text-indigo-600 font-black">Worker</span>, your profile is being reviewed by our security team. 
                  We prioritize quality and trust in our marketplace.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <button onClick={() => setStep('LOGIN')} className="w-full py-4 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">Sign out of account</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 text-center w-full z-10">
        <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px] opacity-40">Helpado Ecosystem • v2.5 Enterprise</p>
      </div>
    </div>
  );
};

export default AuthView;
