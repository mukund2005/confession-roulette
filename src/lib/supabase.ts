import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const sbUrl = params.get('sb_url');
    const sbKey = params.get('sb_key');
    if (sbUrl && sbKey) {
      localStorage.setItem('cr_supabase_url', sbUrl);
      localStorage.setItem('cr_supabase_anon_key', sbKey);
    }
  } catch {
    // ignore
  }
}

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('cr_supabase_url') || '' : '';
const localKey = typeof window !== 'undefined' ? localStorage.getItem('cr_supabase_anon_key') || '' : '';

const activeUrl = envUrl || localUrl;
const activeKey = envKey || localKey;

export const isSupabaseConfigured = Boolean(
  activeUrl && 
  activeKey && 
  activeUrl !== 'https://your-project.supabase.co' && 
  activeKey !== 'your-anon-key-here' &&
  activeUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(activeUrl, activeKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null;

export function saveCustomSupabaseConfig(url: string, key: string) {
  localStorage.setItem('cr_supabase_url', url.trim());
  localStorage.setItem('cr_supabase_anon_key', key.trim());
  window.location.reload();
}

export function clearCustomSupabaseConfig() {
  localStorage.removeItem('cr_supabase_url');
  localStorage.removeItem('cr_supabase_anon_key');
  window.location.reload();
}
