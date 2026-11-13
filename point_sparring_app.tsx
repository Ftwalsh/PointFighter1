import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Home, Book, UploadCloud, Clock, Activity, Trophy, Play, Pause, RotateCcw, 
  CheckCircle2, AlertCircle, ChevronRight, Filter, Target, Camera, ListVideo,
  Monitor, Mail, Lock, User, ArrowRight, Video, Plus, X, Trash2, LogOut
} from 'lucide-react';

// --- SAFE PERSISTENT STORAGE ---
// Uses localStorage with an automatic in-memory fallback so account state,
// onboarding profiles, and tournament logs work reliably in any browser sandbox.
const memoryStore = {};
const safeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  },
  setItem(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch {
      memoryStore[key] = val;
    }
    window.dispatchEvent(new Event('ps-local-sync'));
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
    window.dispatchEvent(new Event('ps-local-sync'));
  }
};

// Error Boundary to catch unexpected component render exceptions gracefully
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans text-slate-900">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-red-100 text-center">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-extrabold mb-1">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-4">{this.state.errorMessage}</p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              Reload View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <PointSparringRoot />
    </AppErrorBoundary>
  );
}

function PointSparringRoot() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // 1. Initialize Local Session Listener
  useEffect(() => {
    const syncLocalAuth = () => {
      try {
        const rawUser = safeStorage.getItem('ps_current_user');
        setUser(rawUser ? JSON.parse(rawUser) : null);
      } catch {
        setUser(null);
      }
      setAuthLoading(false);
    };
    syncLocalAuth();
    window.addEventListener('ps-local-sync', syncLocalAuth);
    return () => window.removeEventListener('ps-local-sync', syncLocalAuth);
  }, []);

  // 2. Sync User Profile
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const syncLocalProfile = () => {
      try {
        const rawProfile = safeStorage.getItem(`ps_profile_${user.uid}`);
        setProfile(rawProfile ? JSON.parse(rawProfile) : null);
      } catch {
        setProfile(null);
      }
      setProfileLoading(false);
    };
    syncLocalProfile();
    window.addEventListener('ps-local-sync', syncLocalProfile);
    return () => window.removeEventListener('ps-local-sync', syncLocalProfile);
  }, [user]);

  // --- ROUTING LOGIC ---
  if (authLoading || profileLoading) return <LoadingScreen />;

  // If user is anonymous (or signed out) and hasn't explicitly created a profile, show Auth
  if ((!user || user.isAnonymous) && !profile) {
    return <AuthScreen user={user} />;
  }

  // If user is signed in (not anon) but has no profile, show Onboarding
  if (user && !user.isAnonymous && !profile) {
    return <OnboardingScreen user={user} />;
  }

  // If profile exists, show Main App
  return <MainApp user={user} profile={profile} />;
}

// --- LOADING SCREEN ---
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans text-slate-900">
      <div className="w-full max-w-md bg-white h-screen flex flex-col items-center justify-center shadow-2xl">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-slate-500 uppercase tracking-widest text-sm">Loading System...</p>
      </div>
    </div>
  );
}

// --- AUTHENTICATION SCREEN ---
function AuthScreen({ user }) {
  const [mode, setMode] = useState('signup'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      const usersRaw = safeStorage.getItem('ps_users');
      const usersList = usersRaw ? JSON.parse(usersRaw) : [];

      if (mode === 'signup') {
        if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error("An account with this email already exists.");
        }
        const newUser = { uid: `local_${Date.now()}`, email, password, isAnonymous: false };
        safeStorage.setItem('ps_users', JSON.stringify([...usersList, newUser]));
        safeStorage.setItem('ps_current_user', JSON.stringify({ uid: newUser.uid, email: newUser.email, isAnonymous: false }));
      } else {
        const found = usersList.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!found) throw new Error("Invalid email or password.");
        safeStorage.setItem('ps_current_user', JSON.stringify({ uid: found.uid, email: found.email, isAnonymous: false }));
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    }
    setIsProcessing(false);
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsProcessing(true);
    try {
      const googleUser = { uid: 'google_fighter_demo', email: 'fighter@gmail.com', isAnonymous: false };
      safeStorage.setItem('ps_current_user', JSON.stringify(googleUser));
    } catch (err) {
      setError("Google Sign-In failed. Please use Email/Password.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white flex flex-col relative shadow-2xl border-x border-gray-200 h-screen p-8 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center py-8">
          
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-6 mx-auto">
            <Trophy size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-center tracking-tight mb-2">Point Sparring</h1>
          <p className="text-center text-slate-500 font-medium mb-8">Master the mat. Track your progress.</p>

          {/* Mode Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create Account
            </button>
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'login' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg text-center flex items-center justify-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="fighter@dojo.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg shadow-md hover:bg-slate-800 transition-colors disabled:opacity-70">
              {isProcessing ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-slate-200 w-full absolute"></div>
            <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest relative z-10">OR</span>
          </div>

          <button onClick={handleGoogleAuth} disabled={isProcessing} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-70 mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}

// --- ONBOARDING SCREEN ---
function OnboardingScreen({ user }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    circuit: 'Both',
    experience: 'Intermediate',
    style: 'Aggressive Blitzer',
    mobility: 'Good'
  });

  const handleSave = () => {
    const profilePayload = {
      ...formData,
      email: user.email,
      createdAt: Date.now()
    };

    try {
      safeStorage.setItem(`ps_profile_${user.uid}`, JSON.stringify(profilePayload));
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center text-slate-900 font-sans">
      <div className="w-full max-w-md flex flex-col shadow-2xl border-x border-gray-200 h-screen">
        <div className="pt-12 pb-6 px-6 border-b border-gray-100">
          <h2 className="text-2xl font-extrabold tracking-tight">Fighter Profile</h2>
          <div className="flex gap-2 mt-4">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold mb-2">Primary Circuit</h3>
              <p className="text-sm text-slate-500 mb-6">Which ruleset do you compete in most?</p>
              <div className="space-y-3">
                {['NASKA', 'WAKO', 'Both'].map(opt => (
                  <div key={opt} onClick={() => setFormData({...formData, circuit: opt})}
                    className={`p-4 border-2 rounded-xl cursor-pointer font-bold transition-all ${formData.circuit === opt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {opt}
                    {opt === 'NASKA' && <span className="block text-xs font-medium text-slate-500 mt-1">Focuses on explosive blitzes and clashes.</span>}
                    {opt === 'WAKO' && <span className="block text-xs font-medium text-slate-500 mt-1">Focuses on strict control and clean retraction.</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold mb-2">Experience & Style</h3>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 mt-6">Experience Level</label>
              <select 
                value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 mb-6 outline-none focus:border-blue-500"
              >
                <option>Beginner (White - Green)</option>
                <option>Intermediate (Brown - Black)</option>
                <option>Advanced (Pro / World Class)</option>
              </select>

              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fighting Style</label>
              <div className="space-y-2">
                {['Lead-Leg Counter Fighter', 'Aggressive Blitzer', 'Kicking Specialist', 'Balanced'].map(opt => (
                  <div key={opt} onClick={() => setFormData({...formData, style: opt})}
                    className={`p-3 border rounded-lg cursor-pointer font-bold text-sm transition-all ${formData.style === opt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold mb-2">Mobility Baselines</h3>
              <p className="text-sm text-slate-500 mb-6">Are there areas we need to focus on stretching?</p>
              <div className="space-y-3">
                {['Good Flexibility', 'Tight Hips / Poor Chamber', 'Tight Hamstrings', 'Past Knee/Ankle Injury'].map(opt => (
                  <div key={opt} onClick={() => setFormData({...formData, mobility: opt})}
                    className={`p-4 border-2 rounded-xl cursor-pointer font-bold transition-all ${formData.mobility === opt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors">
              Continue <ArrowRight size={18} />
            </button>
          ) : (
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors">
              Complete Profile <CheckCircle2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP CONTAINER & NAVIGATION ---

function MainApp({ user, profile }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white flex flex-col relative shadow-2xl border-x border-gray-200 overflow-hidden h-screen">
        
        <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard user={user} profile={profile} />}
          {activeTab === 'library' && <Library />}
          {activeTab === 'upload' && <AIUpload profile={profile} />}
          {activeTab === 'timer' && <SparringTimer />}
          {activeTab === 'profile' && <ProfileTab user={user} profile={profile} />}
        </div>

        <div className="absolute bottom-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center z-50 pb-safe">
          <NavButton icon={<Home />} label="Home" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={<Book />} label="Library" isActive={activeTab === 'library'} onClick={() => setActiveTab('library')} />
          <NavButton icon={<UploadCloud />} label="Analyze" isActive={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
          <NavButton icon={<Clock />} label="Timer" isActive={activeTab === 'timer'} onClick={() => setActiveTab('timer')} />
          <NavButton icon={<User />} label="Profile" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; }
        .pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 12px); }
      `}} />
    </div>
  );
}

const NavButton = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors flex-1 ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
    {React.cloneElement(icon, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}
    <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
  </button>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-4 text-slate-800">
    {icon}
    <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
  </div>
);

// --- TAB 1: DASHBOARD (Empty State & Real Form) ---

function Dashboard({ user, profile }) {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form Fields
  const [eventName, setEventName] = useState('');
  const [circuit, setCircuit] = useState('NASKA');
  const [division, setDivision] = useState('');
  const [placement, setPlacement] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;

    const syncLocalLogs = () => {
      try {
        const raw = safeStorage.getItem(`ps_tournaments_${user.uid}`);
        const logs = raw ? JSON.parse(raw) : [];
        logs.sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(logs);
      } catch {
        setTournaments([]);
      }
    };
    syncLocalLogs();
    window.addEventListener('ps-local-sync', syncLocalLogs);
    return () => window.removeEventListener('ps-local-sync', syncLocalLogs);
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!eventName || !division) return;
    setIsSubmitting(true);
    const newEntry = {
      id: `log_${Date.now()}`,
      eventName,
      circuit,
      division,
      placement,
      notes,
      createdAt: Date.now()
    };

    try {
      const raw = safeStorage.getItem(`ps_tournaments_${user.uid}`);
      const existing = raw ? JSON.parse(raw) : [];
      safeStorage.setItem(
        `ps_tournaments_${user.uid}`, 
        JSON.stringify([newEntry, ...existing])
      );
      setShowForm(false);
      setEventName(''); setDivision(''); setPlacement(''); setNotes('');
    } catch (err) {
      console.error("Error adding tournament log:", err);
    }
    setIsSubmitting(false);
  };

  const deleteLog = (id) => {
    try {
      const raw = safeStorage.getItem(`ps_tournaments_${user.uid}`);
      const existing = raw ? JSON.parse(raw) : [];
      safeStorage.setItem(
        `ps_tournaments_${user.uid}`, 
        JSON.stringify(existing.filter(item => item.id !== id))
      );
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  };

  return (
    <div className="p-5 space-y-6 bg-gray-50 min-h-full">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Welcome back, Fighter.</p>
      </header>

      {/* Stats - Zeroed out for new users as requested */}
      <SectionHeader title="Training Consistency" icon={<Activity size={18} className="text-blue-600" />} />
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center py-6">
          <div className="text-3xl font-extrabold text-slate-800 mb-1">
            {tournaments.length}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tournaments Logged</span>
        </Card>
        
        <Card className="flex flex-col items-center justify-center py-6">
          <div className="text-3xl font-extrabold text-slate-800 mb-1">0<span className="text-lg text-slate-400 font-medium">s</span></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center">Avg AI Hold Time</span>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Trophy size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Tournament Logs</h2>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700">
            <Plus size={14} /> Add Log
          </button>
        )}
      </div>

      {showForm && (
        <Card className="mb-4 animate-in fade-in zoom-in duration-200 border-blue-200">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800">New Match Result</h3>
             <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
             <input type="text" required placeholder="Event Name (e.g. Diamond Nationals)" value={eventName} onChange={e=>setEventName(e.target.value)} className="w-full text-sm border border-slate-200 rounded p-2 bg-slate-50 outline-none focus:border-blue-500"/>
             <div className="flex gap-2">
                <select value={circuit} onChange={e=>setCircuit(e.target.value)} className="flex-1 text-sm border border-slate-200 rounded p-2 bg-slate-50 outline-none focus:border-blue-500">
                  <option>NASKA</option><option>WAKO</option><option>Other</option>
                </select>
                <input type="text" required placeholder="Division" value={division} onChange={e=>setDivision(e.target.value)} className="flex-2 w-2/3 text-sm border border-slate-200 rounded p-2 bg-slate-50 outline-none focus:border-blue-500"/>
             </div>
             <input type="text" placeholder="Placement (e.g. 1st Place, Semi-Finals)" value={placement} onChange={e=>setPlacement(e.target.value)} className="w-full text-sm border border-slate-200 rounded p-2 bg-slate-50 outline-none focus:border-blue-500"/>
             <textarea placeholder="Match Notes & Takeaways..." value={notes} onChange={e=>setNotes(e.target.value)} className="w-full text-sm border border-slate-200 rounded p-2 bg-slate-50 outline-none focus:border-blue-500 min-h-[80px] resize-none"></textarea>
             <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded hover:bg-slate-800">
               {isSubmitting ? 'Saving...' : 'Save Log'}
             </button>
          </form>
        </Card>
      )}

      <div className="space-y-3 pb-4">
        {tournaments.length === 0 && !showForm ? (
          <div className="text-center p-8 bg-white border border-slate-200 rounded-xl border-dashed">
            <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-slate-800 font-bold mb-1 text-sm">No Tournaments Yet</h3>
            <p className="text-slate-500 text-xs mb-4">Add your first tournament result to track your competition history.</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 font-bold hover:underline">Log a match</button>
          </div>
        ) : (
          tournaments.map(log => (
            <Card key={log.id} className="relative group">
              <button onClick={() => deleteLog(log.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
              <div className="flex flex-col items-start mb-2 pr-6">
                <h3 className="font-bold text-slate-900 leading-tight">{log.eventName}</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">
                  {log.circuit} • {log.division}
                </p>
              </div>
              {log.placement && (
                <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded mb-2 uppercase tracking-wide">
                  {log.placement}
                </span>
              )}
              {log.notes && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-700 italic">"{log.notes}"</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// --- TAB 5: PROFILE SETTINGS ---

function ProfileTab({ user, profile }) {
  const handleSignOut = () => {
    try {
      safeStorage.removeItem('ps_current_user');
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  return (
    <div className="p-5 bg-gray-50 min-h-full">
      <header className="pt-4 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Account Profile</h1>
      </header>

      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
           {user.email ? user.email.charAt(0).toUpperCase() : 'F'}
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg">{user.email || 'Fighter'}</h2>
          <p className="text-xs text-slate-500 font-mono">UID: {user.uid.substring(0,8)}...</p>
        </div>
      </div>

      <SectionHeader title="Training Profile" icon={<Target size={18} className="text-blue-600" />} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Circuit Focus</span>
            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{profile.circuit}</span>
         </div>
         <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Experience</span>
            <span className="text-sm font-bold text-slate-900">{profile.experience}</span>
         </div>
         <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Style</span>
            <span className="text-sm font-bold text-slate-900">{profile.style}</span>
         </div>
         <div className="p-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Mobility Notes</span>
            <span className="text-sm font-bold text-slate-900">{profile.mobility}</span>
         </div>
      </div>

      <button onClick={handleSignOut} className="w-full bg-white border border-red-200 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}

// --- TAB 2: LIBRARY ---

const mockDrills = [
  { id: 1, title: 'The NASKA Clash Setup', category: 'Hand Techniques', tags: ['NASKA', 'Partner'] },
  { id: 2, title: 'WAKO Clean-Pull Drill', category: 'Hand Techniques', tags: ['WAKO', 'Solo'] },
  { id: 3, title: 'Isometric Extension Hold', category: 'Side Kick', tags: ['Mobility', 'Solo'] },
  { id: 4, title: 'Target Evasion Spin', category: 'Hook & Spin Kicks', tags: ['NASKA', 'Partner'] },
  { id: 5, title: 'Over-the-Chair Chamber', category: 'Side Kick', tags: ['Mobility', 'Solo'] },
  { id: 6, title: 'Metronome Bouncing', category: 'Footwork', tags: ['Rhythm', 'Solo'] },
];

function Library() {
  return (
    <div className="p-5 bg-white min-h-full">
      <header className="pt-4 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-4">Drill Library</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Search drills, stretches..." className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          <button className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-slate-600"><Filter size={20} /></button>
        </div>
      </header>

      <SectionHeader title="All Drills" icon={<ListVideo size={18} className="text-blue-600" />} />
      <div className="space-y-3 pb-6">
        {mockDrills.map(drill => (
          <Card key={drill.id} className="hover:border-blue-300 transition-colors cursor-pointer flex items-center justify-between group">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-blue-700">{drill.title}</h3>
              <p className="text-xs text-slate-500 mb-2 font-medium">{drill.category}</p>
              <div className="flex gap-1.5">
                {drill.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{tag}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- TAB 3: AI UPLOAD ---

function AIUpload({ profile }) {
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      startAnalysisProcess();
    }
  };

  const startAnalysisProcess = () => {
    setStatus('uploading');
    setProgress(0);
    
    // Simulate upload & analysis
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setStatus('analyzing'), 400);
          setTimeout(() => setStatus('results'), 2500);
          return 100;
        }
        return p + Math.floor(Math.random() * 15 + 5);
      });
    }, 250);
  };

  const reset = () => {
    setStatus('idle');
    setSelectedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-5 bg-gray-50 min-h-full flex flex-col">
      <header className="pt-4 pb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">AI Form Analysis</h1>
        <p className="text-sm text-slate-500 font-medium">Upload technique for ruleset evaluation</p>
      </header>

      {status === 'idle' && (
        <div className="flex-1 flex flex-col">
          <input 
            type="file" 
            accept="video/*" 
            className="hidden" 
            id="video-upload" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <label 
            htmlFor="video-upload"
            className="flex-1 border-2 border-dashed border-slate-300 bg-white rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all text-center min-h-[300px] group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Tap to Select Video</h3>
            <p className="text-xs text-slate-500 max-w-[200px]">Ensure full body is visible in the frame for accurate joint tracking.</p>
          </label>
        </div>
      )}

      {status === 'uploading' && (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-8 min-h-[300px]">
          <UploadCloud size={48} className="text-blue-500 mb-6 animate-bounce" />
          <h3 className="font-bold text-slate-900 mb-2">Uploading Clip...</h3>
          <p className="text-xs font-mono text-slate-400 mb-4 truncate w-full text-center px-4">{selectedFileName}</p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-200 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-mono">{progress}% Complete</p>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="flex-1 bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-8 min-h-[300px] text-white">
          <Monitor size={48} className="text-emerald-400 mb-6 animate-pulse" />
          <h3 className="font-bold text-lg mb-2">Processing Mechanics</h3>
          <p className="text-sm text-slate-400 text-center animate-pulse">
            {profile?.circuit === 'WAKO' ? 'Running WAKO strict control protocols...' : 'Analyzing blitz posture and chamber...'}
          </p>
        </div>
      )}

      {status === 'results' && (
        <div className="space-y-4 pb-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800 shadow-md">
            <Video size={48} className="text-slate-700" />
            <span className="text-xs text-slate-400 uppercase font-bold absolute top-2 left-2 tracking-widest">{selectedFileName}</span>
            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
              <span className="text-[10px] bg-black/60 text-emerald-400 px-2 py-1 rounded font-mono">CHAMBER: 88°</span>
              <span className="text-[10px] bg-black/60 text-amber-400 px-2 py-1 rounded font-mono">RETRACT: 0.4s</span>
            </div>
          </div>

          <Card>
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Target size={18} className="text-blue-600"/> Analysis Results
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-900">Side Kick Chamber</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Solid</span>
                  </div>
                  <p className="text-xs text-slate-500">Chamber height is excellent, maintaining balance and hiding the extension angle well.</p>
                </div>
              </div>

              <div className="w-full h-px bg-slate-100"></div>

              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-900">Punch Snap-Back</span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Flagged</span>
                  </div>
                  <p className="text-xs text-slate-500">Reverse punch hung out for 0.4s. {profile?.circuit === 'WAKO' ? 'WAKO requires immediate retraction to avoid clashing penalties.' : 'Retract faster to prevent getting countered on the blitz.'}</p>
                </div>
              </div>
            </div>
          </Card>

          <button onClick={reset} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors shadow-sm">
            Upload Another Clip
          </button>
        </div>
      )}
    </div>
  );
}

// --- TAB 4: TIMER ENGINE ---

function SparringTimer() {
  const [roundDuration, setRoundDuration] = useState(120);
  const [restDuration, setRestDuration] = useState(60);
  const [totalRounds, setTotalRounds] = useState(3);
  const [cuesEnabled, setCuesEnabled] = useState(true);
  
  const [phase, setPhase] = useState('IDLE');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(roundDuration * 1000);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [visualColor, setVisualColor] = useState('NONE');
  const [activeCueText, setActiveCueText] = useState('');

  const endTimeRef = useRef(0);
  const pausedTimeRemainingRef = useRef(0);
  const nextCueTimeRef = useRef(0);
  const configRef = useRef({ roundDuration, restDuration, totalRounds, cuesEnabled });
  const techniques = ['Blitz', 'Slide In Side Kick', 'Check and Retreat'];

  useEffect(() => {
    configRef.current = { roundDuration, restDuration, totalRounds, cuesEnabled };
    if (phase === 'IDLE') setTimeRemaining(roundDuration * 1000);
  }, [roundDuration, restDuration, totalRounds, cuesEnabled, phase]);

  const triggerCue = useCallback(() => {
    const isAttack = Math.random() > 0.35;
    setVisualColor(isAttack ? 'GREEN' : 'RED');
    
    const randomTech = techniques[Math.floor(Math.random() * techniques.length)];
    setActiveCueText(randomTech);

    try {
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(randomTech);
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore speech synthesis restrictions in sandboxed environments
    }

    setTimeout(() => setVisualColor('NONE'), 700);
    setTimeout(() => setActiveCueText(''), 2000);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = endTimeRef.current - now;
      const { cuesEnabled, restDuration, roundDuration, totalRounds } = configRef.current;

      if (phase === 'WORK' && cuesEnabled && now >= nextCueTimeRef.current) {
        triggerCue();
        nextCueTimeRef.current = now + (Math.random() * 3000 + 2500); 
      }

      if (remaining <= 0) {
        if (phase === 'WORK') {
          if (currentRound >= totalRounds) {
            setPhase('FINISHED');
            setIsRunning(false);
            setTimeRemaining(0);
          } else {
            setPhase('REST');
            endTimeRef.current = now + (restDuration * 1000);
          }
        } else if (phase === 'REST') {
          setCurrentRound(r => r + 1);
          setPhase('WORK');
          endTimeRef.current = now + (roundDuration * 1000);
          if (cuesEnabled) nextCueTimeRef.current = now + 2000;
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, [isRunning, phase, currentRound, triggerCue]);

  const handleStart = () => {
    const safeRoundSec = Math.max(5, Number(roundDuration) || 120);
    const safeRestSec = Math.max(5, Number(restDuration) || 60);
    if (safeRoundSec !== roundDuration) setRoundDuration(safeRoundSec);
    if (safeRestSec !== restDuration) setRestDuration(safeRestSec);

    if (phase === 'IDLE' || phase === 'FINISHED') {
      setPhase('WORK');
      setCurrentRound(1);
      endTimeRef.current = Date.now() + (safeRoundSec * 1000);
      if (cuesEnabled) nextCueTimeRef.current = Date.now() + 2000;
    } else if (isPaused) {
      endTimeRef.current = Date.now() + pausedTimeRemainingRef.current;
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    pausedTimeRemainingRef.current = endTimeRef.current - Date.now();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPhase('IDLE');
    setCurrentRound(1);
    setTimeRemaining(roundDuration * 1000);
    setVisualColor('NONE');
    setActiveCueText('');
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // Ignore speech synthesis restrictions
    }
  };

  const formatTime = (ms) => {
    if (ms < 0) ms = 0;
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getBgStyle = () => {
    if (visualColor === 'GREEN') return 'bg-emerald-500 text-white';
    if (visualColor === 'RED') return 'bg-rose-500 text-white';
    if (phase === 'REST') return 'bg-amber-50 text-slate-900 border-amber-200 border-2';
    return 'bg-white text-slate-900 border-gray-200 border';
  };

  return (
    <div className="p-5 bg-gray-50 min-h-full flex flex-col items-center">
      <header className="w-full pt-4 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Mat-Side Timer</h1>
      </header>

      <div className={`w-full rounded-3xl p-8 mb-6 shadow-sm flex flex-col items-center justify-center transition-colors duration-200 min-h-[300px] relative ${getBgStyle()}`}>
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
            phase === 'WORK' ? 'bg-emerald-100 text-emerald-700' : 
            phase === 'REST' ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
          }`}>
            {phase === 'IDLE' ? 'READY' : phase}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-600">
            RND {currentRound}/{totalRounds}
          </span>
        </div>

        <div className="text-7xl font-mono font-bold tracking-tighter tabular-nums mt-6 mb-4">
          {formatTime(timeRemaining)}
        </div>

        <div className="h-6">
          {activeCueText && (
             <span className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold uppercase animate-pulse">
               {activeCueText}
             </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        {isRunning ? (
          <button onClick={handlePause} className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shadow-sm">
            <Pause size={28} fill="currentColor" />
          </button>
        ) : (
          <button onClick={handleStart} className="w-20 h-20 rounded-full bg-blue-600 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all">
            <Play size={36} fill="currentColor" className="ml-1" />
          </button>
        )}
        <button onClick={handleReset} disabled={phase === 'IDLE'} className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
          <RotateCcw size={24} />
        </button>
      </div>

      <div className="w-full space-y-3 pb-6">
        <Card className="flex items-center justify-between">
          <span className="font-bold text-sm text-slate-700">Random Cues</span>
          <label className="relative flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only" checked={cuesEnabled} onChange={() => setCuesEnabled(!cuesEnabled)} disabled={isRunning} />
            <div className={`w-10 h-6 rounded-full transition-colors ${cuesEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${cuesEnabled ? 'translate-x-4' : ''}`}></div>
          </label>
        </Card>
        
        <Card className="grid grid-cols-2 gap-4">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Work (sec)</label>
             <input type="number" value={roundDuration} onChange={e => setRoundDuration(Number(e.target.value))} disabled={isRunning} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-blue-500" />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Rest (sec)</label>
             <input type="number" value={restDuration} onChange={e => setRestDuration(Number(e.target.value))} disabled={isRunning} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-blue-500" />
           </div>
        </Card>
      </div>
    </div>
  );
}