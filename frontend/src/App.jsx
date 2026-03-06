import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { Zap, Globe, MessageSquare, CheckCircle, ShieldCheck, AlertCircle, Copy } from 'lucide-react';

const translations = {
  en: {
    title: "Global Lead Engine",
    subtitle: "Automated Bilingual Triage & CRM Bridge",
    inputLabel: "Incoming Lead Data",
    placeholder: "Paste a message in English or Spanish...",
    buttonProcess: "Process Lead",
    buttonProcessing: "Analyzing Intent...",
    summaryLabel: "Executive Summary",
    draftLabel: "AI Draft Response",
    syncButton: "Approve & Sync to CRM",
    emptyState: "Awaiting lead input for analysis",
  },
  es: {
    title: "Motor Global de Leads",
    subtitle: "Triaje Automatizado Bilingüe y Conexión CRM",
    inputLabel: "Datos del Lead Entrante",
    placeholder: "Pega un mensaje en inglés o español.",
    buttonProcess: "Procesar Lead",
    buttonProcessing: "Analizando...",
    summaryLabel: "Resumen Ejecutivo",
    draftLabel: "Borrador de Respuesta IA",
    syncButton: "Aprobar y Sincronizar",
    emptyState: "Esperando entrada de lead para análisis",
  }
};

// Allow overriding backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [lang, setLang] = useState('en');
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editedResponse, setEditedResponse] = useState('');
  const [stats, setStats] = useState({ triages: 0, syncs: 0, hotLeads: 0 });

  const t = translations[lang];

  const handleTriage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/triage`, {
        leadMessage: input
      });
      setResult(response.data);
      setEditedResponse(response.data.draft_response);
      // Increment triage count and persist
      const newStats = { ...stats, triages: (stats.triages || 0) + 1 };
      // If the triage marks it as Hot, increment hot counter
      if (response.data && response.data.intent && response.data.intent.toLowerCase() === 'hot') {
        newStats.hotLeads = (newStats.hotLeads || 0) + 1;
      }
      setStats(newStats);
      try { localStorage.setItem('gle_stats', JSON.stringify(newStats)); } catch { /* ignore */ }
    } catch {
      toast.error(lang === 'en' ? 'Connection failed' : 'Conexión fallida');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!result) return;
    setLoading(true);

    try {
      const resp = await axios.post(`${API_URL}/api/sync`, {
        ...result,
        draft_response: editedResponse, // Send the human edited version
        original_message: input
      });
      // If the relay returned an error-like response, surface it
      if (resp && resp.data && resp.data.error) {
        console.error('Sync relay error', resp.data);
        toast.error('Sync failed: ' + (resp.data.error || JSON.stringify(resp.data)));
        setLoading(false);
        return;
      }
      // Increment sync count and persist
      const newStats = { ...stats, syncs: (stats.syncs || 0) + 1 };
      setStats(newStats);
      try { localStorage.setItem('gle_stats', JSON.stringify(newStats)); } catch { /* ignore */ }
      toast.success(lang === 'en' ? 'Synced to CRM' : 'Sincronizado al CRM');
    } catch (err) {
      console.error(err);
      toast.error(lang === 'en' ? 'Sync failed. Check console.' : 'Error al sincronizar. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function
  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(editedResponse || '');
      toast.success(lang === 'en' ? "Copied to clipboard!" : "¡Copiado al portapapeles!");
    } catch {
      toast.error(lang === 'en' ? 'Copy failed' : 'Error al copiar');
    }
  };

  // Load stats from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gle_stats');
      if (raw) setStats(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="antialiased min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-900">
      <Toaster position="top-right" richColors />
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="fill-blue-600 text-blue-600" size={28} /> 
            {t.title} <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2 uppercase tracking-widest">v1.0</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">{t.subtitle}</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="hidden md:flex items-center gap-4 text-[10px] font-black text-slate-400 tracking-widest">
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              <ShieldCheck size={12} className="text-emerald-500" /> MISTRAL-AI SECURE
            </span>
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              <Globe size={12} className="text-blue-500" /> EN/ES ACTIVE
            </span>
          </div>

          {/* Language Toggle */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
          >
            <Globe size={14} />
            {lang === 'en' ? 'CAMBIAR A ESPAÑOL' : 'CHANGE TO ENGLISH'}
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-5xl mx-auto mb-8 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Triage</p>
          <p className="text-2xl font-bold text-slate-900">{stats.triages || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hot Leads</p>
          <p className="text-2xl font-bold text-slate-900">{stats.hotLeads || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synced to CRM</p>
          <p className="text-2xl font-bold text-slate-900">{stats.syncs || 0}</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">
              {t.inputLabel}
            </label>
            <textarea 
              className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-700 placeholder:text-slate-300"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              onClick={handleTriage}
              disabled={loading}
              className="mt-4 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.buttonProcessing : t.buttonProcess}
            </button>
          </div>
        </div>

        {/* Right: AI */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-4 flex justify-between items-center">
                <div className="flex gap-2 text-white">
                   <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded text-[10px] font-black">
                     <Globe size={10}/> {result.language.toUpperCase()}
                   </div>
                   <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black ${
                    result.intent === 'Hot' ? 'bg-red-500' : 'bg-orange-500'
                   }`}>
                    {result.intent.toUpperCase()} ({result.confidence_score ?? 0}% confidence)
                   </div>
                </div>
                <AlertCircle size={18} className="text-slate-500" />
              </div>

              <div className="p-8 space-y-8">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.summaryLabel}</h3>
                  <p className="text-xl font-medium text-slate-800 leading-tight italic">
                    "{result.summary}"
                  </p>
                </section>

                <section className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{t.draftLabel}</h3>
                    <button 
                      onClick={copyToClipboard}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Copy size={12} /> {lang === 'en' ? "COPY" : "COPIAR"}
                    </button>
                  </div>
                  <textarea
                    className="w-full p-4 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-400 resize-vertical text-slate-700 leading-relaxed text-sm"
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    rows={8}
                  />
                </section>

                <button 
                  onClick={handleSync}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  <CheckCircle size={20} /> {t.syncButton}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-100 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 space-y-2 bg-slate-50/50">
              <MessageSquare size={48} className="opacity-10" />
              <p className="font-medium text-sm tracking-wide uppercase opacity-40">{t.emptyState}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
  
}

export default App;