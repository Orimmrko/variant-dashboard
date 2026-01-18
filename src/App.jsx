import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import {
  LayoutDashboard, RefreshCcw, Trophy, BarChart3,
  FlaskConical, PieChart as PieIcon, TrendingUp, Table as TableIcon,
  Plus, X, Trash2, Settings, PlayCircle, PauseCircle, Percent, Lock, LogOut
} from 'lucide-react';

// --- CONFIGURATION ---
const API_BASE_URL = "https://variant-backend-lfoa.onrender.com";

const App = () => {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // --- APP STATE ---
  // טעינת רשימת האפליקציות המותרות מהזיכרון
  const [allowedApps, setAllowedApps] = useState(() => {
    const saved = localStorage.getItem("variant_allowed_apps");
    return saved ? JSON.parse(saved) : [];
  });

  const [appId, setAppId] = useState(() => localStorage.getItem("variant_app_id") || "default");

  const [experiments, setExperiments] = useState([]);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [newExpName, setNewExpName] = useState("");
  const [newExpKey, setNewExpKey] = useState("");
  const [variantA, setVariantA] = useState("Control");
  const [variantB, setVariantB] = useState("Variant B");
  const [editStatus, setEditStatus] = useState("active");
  const [editVariants, setEditVariants] = useState([]);
  const [trafficSum, setTrafficSum] = useState(100);
  const COLORS = ['#6366f1', '#a5b4fc', '#e0e7ff', '#94a3b8'];

  // --- AUTH CHECK ON LOAD ---
  useEffect(() => {
    const savedKey = localStorage.getItem("variant_admin_key");
    if (savedKey) {
      setIsAuthenticated(true);
      // אם יש מפתח שמור, אפשר עקרונית לבצע בדיקת אימות מול השרת כאן
      // כדי לוודא שהוא עדיין בתוקף ולרענן את רשימת האפליקציות
    }
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem("variant_app_id", appId);
  }, [appId]);

  useEffect(() => {
    localStorage.setItem("variant_allowed_apps", JSON.stringify(allowedApps));
  }, [allowedApps]);

  // --- SECURE API FETCH HELPER ---
  const secureFetch = async (endpoint, options = {}) => {
    const key = localStorage.getItem("variant_admin_key");
    const headers = {
      'Content-Type': 'application/json',
      'X-Admin-Key': key,
      'X-App-ID': appId // שליחת ה-ID שנבחר בכל בקשה
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (response.status === 401 || response.status === 403) {
      // אם אין הרשאה - התנתק
      if (endpoint !== '/api/admin/login') {
        handleLogout();
        throw new Error("Unauthorized");
      }
    }
    return response;
  };

  // --- API CALLS ---
  const fetchExperiments = async () => {
    try {
      const response = await secureFetch(`/api/admin/experiments`);
      if (response.ok) {
        const data = await response.json();
        setExperiments(data);
        // בחירה אוטומטית של הניסוי הראשון אם אין בחירה
        if (data.length > 0) {
          if (!selectedExperiment || !data.find(e => e.key === selectedExperiment)) {
            setSelectedExperiment(data[0].key);
          }
        } else {
          setSelectedExperiment(null);
        }
      } else {
        // במקרה של שגיאה או רשימה ריקה (למשל אפליקציה אסורה)
        setExperiments([]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    if (!selectedExperiment) {
      setRawData(null);
      return;
    }
    setLoading(true); setError(null);
    try {
      const response = await secureFetch(`/api/admin/summary/${selectedExperiment}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setRawData(data);
    } catch (err) {
      if (isAuthenticated) setError("Connection failed.");
    }
    finally { setLoading(false); }
  };

  // שליפה מחדש כשמתחברים או כשמחליפים אפליקציה
  useEffect(() => {
    if (isAuthenticated) {
      setExperiments([]);
      setSelectedExperiment(null);
      fetchExperiments();
    }
  }, [isAuthenticated, appId]);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [selectedExperiment, isAuthenticated]);

  // --- AUTH ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("variant_admin_key", passwordInput);

        // עדכון רשימת האפליקציות המותרות
        setAllowedApps(data.allowed_apps);

        // אם האפליקציה שנבחרה כרגע לא ברשימה, החלף לראשונה ברשימה
        if (data.allowed_apps.length > 0 && !data.allowed_apps.includes(appId)) {
          setAppId(data.allowed_apps[0]);
        }

        setIsAuthenticated(true);
      } else {
        setAuthError("Invalid API Key");
      }
    } catch (err) { setAuthError("Server Connection Error"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("variant_admin_key");
    localStorage.removeItem("variant_allowed_apps");
    setIsAuthenticated(false);
    setExperiments([]);
    setRawData(null);
    setAllowedApps([]);
  };

  // --- EXPERIMENT ACTIONS ---
  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      appId: appId,
      name: newExpName, key: newExpKey,
      variants: [
        { name: variantA, value: variantA.toLowerCase(), traffic_percentage: 50 },
        { name: variantB, value: variantB.toLowerCase(), traffic_percentage: 50 }
      ]
    };
    await secureFetch(`/api/experiments`, { method: 'POST', body: JSON.stringify(payload) });
    setShowCreateModal(false); fetchExperiments();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this experiment?")) return;
    await secureFetch(`/api/admin/experiments/${selectedExperiment}`, { method: 'DELETE' });
    // רענון מלא במקום רילוד
    fetchExperiments();
    setSelectedExperiment(null);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure? This will wipe all data for this experiment.")) return;
    await secureFetch(`/api/admin/stats/${selectedExperiment}`, { method: 'DELETE' });
    setShowEditModal(false); fetchData();
  };

  const handleUpdate = async () => {
    if (trafficSum !== 100) return;
    await secureFetch(`/api/admin/experiments/${selectedExperiment}`, {
      method: 'PUT', body: JSON.stringify({ status: editStatus, variants: editVariants })
    });
    setShowEditModal(false); fetchExperiments();
  };

  // ... Helpers ...
  const openEditModal = () => {
    const current = experiments.find(e => e.key === selectedExperiment);
    if (!current) return;
    setEditStatus(current.status || 'active');
    setEditVariants(JSON.parse(JSON.stringify(current.variants || [])));
    setTrafficSum(100); setShowEditModal(true);
  };

  const handleTrafficChange = (index, newValue) => {
    const updated = [...editVariants];
    updated[index].traffic_percentage = parseInt(newValue) || 0;
    setEditVariants(updated);
    setTrafficSum(updated.reduce((acc, c) => acc + (c.traffic_percentage || 0), 0));
  };

  const processedData = useMemo(() => {
    if (!rawData || !rawData.aggregated_variants) return [];
    return rawData.aggregated_variants.map((v) => {
      const name = v._id || v.variant_name || "Unknown";
      const exp = v.count || v.exposures || 0;
      const conv = v.conversions || 0;
      const rate = exp > 0 ? ((conv / exp) * 100).toFixed(2) : 0;
      return { name, exposure: exp, conversion: conv, rate: parseFloat(rate) };
    }).sort((a, b) => b.rate - a.rate);
  }, [rawData]);

  const stats = useMemo(() => {
    if (processedData.length < 2) return null;
    const winner = processedData[0];
    const loser = processedData[processedData.length - 1];
    const uplift = loser.rate > 0 ? (((winner.rate - loser.rate) / loser.rate) * 100).toFixed(1) : 100;
    return { winner, loser, uplift };
  }, [processedData]);

  const currentExp = experiments.find(e => e.key === selectedExperiment);
  const currentExpStatus = currentExp?.status || 'active';

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <div className="bg-indigo-100 p-3 rounded-full inline-block mb-4">
            <Lock className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Variant Admin</h1>
          <p className="text-slate-500 text-sm mb-6">Enter your API Key to access.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="API Key"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-md">
              Access Dashboard
            </button>
          </form>
        </div>
        <p className="mt-8 text-slate-400 text-xs">Variant.ai • Secure Analytics Platform</p>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shadow-lg z-10 shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <FlaskConical className="text-indigo-600" size={20} />
          <h1 className="font-bold text-lg tracking-tight text-slate-900">Variant<span className="text-indigo-600">.ai</span></h1>
        </div>

        {/* --- APP ID SELECTOR (UPDATED) --- */}
        <div className="px-4 pt-4 pb-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target App ID</label>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <select
              className="bg-transparent text-xs font-mono text-slate-700 w-full outline-none font-bold cursor-pointer"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            >
              {allowedApps.length === 0 && <option value="default">No Apps Found</option>}
              {allowedApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
          </div>
        </div>
        {/* --------------------------- */}

        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
          <div className="flex justify-between items-center px-2 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Experiments</p>
            <button onClick={() => setShowCreateModal(true)} className="p-1 hover:bg-slate-100 rounded text-indigo-600"><Plus size={16} /></button>
          </div>
          {experiments.length === 0 && <p className="text-xs text-slate-400 px-2 italic">No experiments found.</p>}
          {experiments.map((exp) => (
            <button key={exp.key} onClick={() => setSelectedExperiment(exp.key)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${selectedExperiment === exp.key ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 truncate max-w-[140px]"><LayoutDashboard size={16} /> {exp.name}</div>
              {exp.status === 'paused' && <span className="w-2 h-2 rounded-full bg-amber-400" title="Paused"></span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-600 text-xs font-bold transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden p-4 lg:p-6 gap-4 bg-slate-50/50">
        <header className="flex justify-between items-center shrink-0 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{currentExp?.name || "Select an Experiment"}</h2>
              {currentExpStatus === 'paused' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full">Paused</span>}
            </div>
            {currentExp && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${currentExpStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <p className="text-slate-400 text-xs font-medium">{currentExpStatus === 'active' ? 'Live Data Stream' : 'Experiment Paused'}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={openEditModal} disabled={!currentExp} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"><Settings size={14} /> Manage</button>
            <button onClick={handleDelete} disabled={!currentExp} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"><Trash2 size={18} /></button>
            <button onClick={fetchData} disabled={loading || !currentExp} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"><RefreshCcw size={14} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </header>

        {/* --- CHARTS --- */}
        {!processedData.length ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">{selectedExperiment ? "No data yet. Start the test!" : "Select an experiment from the left."}</div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* ... Statistics Cards ... */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center"><div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Traffic</p><p className="text-2xl font-bold text-slate-800 mt-1">{processedData.reduce((acc, c) => acc + c.exposure, 0)}</p></div><div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><PieIcon size={20} /></div></div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center"><div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Conversions</p><p className="text-2xl font-bold text-slate-800 mt-1">{processedData.reduce((acc, c) => acc + c.conversion, 0)}</p></div><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div></div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center"><div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Uplift</p><p className="text-2xl font-bold text-indigo-600 mt-1">+{stats?.uplift}%</p></div><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BarChart3 size={20} /></div></div>
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 rounded-xl shadow-md text-white flex justify-between items-center relative overflow-hidden"><Trophy size={60} className="absolute -right-2 -bottom-2 opacity-10" /><div className="relative z-10"><p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">Winner</p><p className="text-lg font-bold capitalize truncate max-w-[120px]">{stats?.winner.name.replace('_', ' ')}</p><span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-semibold">{stats?.winner.rate}% CR</span></div></div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
              <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0"><h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2 shrink-0"><BarChart3 size={16} className="text-slate-400" /> Conversion Rate</h3><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={processedData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => val.replace('_', ' ')} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" width={30} /><Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} /><Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>{processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#cbd5e1'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0"><h3 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2 shrink-0"><PieIcon size={16} className="text-slate-400" /> Distribution</h3><div className="flex-1 min-h-0 relative"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={processedData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="exposure">{processedData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6"><div className="text-center"><p className="text-xl font-bold text-slate-700">{processedData.reduce((acc, curr) => acc + curr.exposure, 0)}</p></div></div></div></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col">
              <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0"><TableIcon size={14} className="text-slate-400" /><h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Raw Data</h3></div>
              <div className="overflow-auto max-h-40"><table className="w-full text-left border-collapse"><thead><tr className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100"><th className="px-4 py-2">Variant</th><th className="px-4 py-2 text-right">Views</th><th className="px-4 py-2 text-right">Clicks</th><th className="px-4 py-2 text-right">CR%</th></tr></thead><tbody className="divide-y divide-slate-50">{processedData.map((row) => (<tr key={row.name} className="hover:bg-slate-50 text-xs"><td className="px-4 py-2 font-medium text-slate-800 capitalize">{row.name.replace('_', ' ')}</td><td className="px-4 py-2 text-right text-slate-500">{row.exposure}</td><td className="px-4 py-2 text-right text-slate-500">{row.conversion}</td><td className="px-4 py-2 text-right font-bold text-slate-700">{row.rate}%</td></tr>))}</tbody></table></div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {showCreateModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800">New Experiment</h3><button onClick={() => setShowCreateModal(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label><input required className="w-full px-3 py-2 border rounded-lg text-sm" value={newExpName} onChange={e => setNewExpName(e.target.value)} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key</label><input required className="w-full px-3 py-2 border rounded-lg text-sm font-mono" value={newExpKey} onChange={e => setNewExpKey(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variant A</label><input required className="w-full px-3 py-2 border rounded-lg text-sm" value={variantA} onChange={e => setVariantA(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variant B</label><input required className="w-full px-3 py-2 border rounded-lg text-sm" value={variantB} onChange={e => setVariantB(e.target.value)} /></div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700">Launch</button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800">Manage Experiment</h3><button onClick={() => setShowEditModal(false)}><X size={20} className="text-slate-400" /></button></div>
            <div className="p-6 space-y-6">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3">Status</label><div className="flex gap-2"><button onClick={() => setEditStatus('active')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${editStatus === 'active' ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><PlayCircle size={16} /> Active</button><button onClick={() => setEditStatus('paused')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${editStatus === 'paused' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><PauseCircle size={16} /> Paused</button></div></div>
              <div><div className="flex justify-between items-center mb-3"><label className="block text-xs font-bold text-slate-500 uppercase">Traffic Allocation</label><span className={`text-xs font-bold px-2 py-0.5 rounded ${trafficSum === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Total: {trafficSum}%</span></div><div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">{editVariants.map((variant, idx) => (<div key={idx} className="flex items-center gap-3"><span className="text-sm font-medium text-slate-700 w-24 truncate capitalize">{variant.name}</span><div className="flex-1 relative"><input type="number" min="0" max="100" className="w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={variant.traffic_percentage} onChange={(e) => handleTrafficChange(idx, e.target.value)} /><Percent size={14} className="absolute right-2 top-2 text-slate-400" /></div></div>))}</div></div>
              <button onClick={handleUpdate} disabled={trafficSum !== 100} className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all">{trafficSum === 100 ? "Save Changes" : "Total must be 100%"}</button>
              <div className="pt-4 border-t border-slate-100"><button onClick={handleReset} className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg text-xs font-bold transition-colors"><Trash2 size={14} /> Reset Data (Restart Test)</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;