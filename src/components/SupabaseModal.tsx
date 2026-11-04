import React, { useState } from 'react';
import { Database, Check, X, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured, saveCustomSupabaseConfig, clearCustomSupabaseConfig } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('cr_supabase_url') || import.meta.env.VITE_SUPABASE_URL || ''
      : ''
  );
  const [key, setKey] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('cr_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      : ''
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) return;
    saveCustomSupabaseConfig(url, key);
  };

  const handleReset = () => {
    clearCustomSupabaseConfig();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Multi-Device Cloud Sync</h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isSupabaseConfigured ? '● Supabase Connected' : '● Local-Only Mode'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          To play with friends on <strong>separate phones and computers</strong>, the game needs a
          shared free Supabase database. You can paste your project credentials below or set them in
          Vercel.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Supabase Anon Public Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block mb-1">Quick 2-minute Setup:</span>
            <p>1. Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="h-3 w-3" /></a></p>
            <p>2. Run the SQL script from <code className="text-rose-400 bg-slate-900 px-1 py-0.5 rounded">supabase_schema.sql</code> in Supabase SQL editor.</p>
            <p>3. Copy the URL and Anon Key from Project Settings &gt; API into this box.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4" /> Save & Connect
            </button>
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all border border-slate-700 hover:border-rose-500/30"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
