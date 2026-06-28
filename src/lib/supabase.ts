import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:', {
  url: supabaseUrl ? 'present' : 'missing',
  key: supabaseAnonKey ? 'present' : 'missing',
  allEnv: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    // Disable the navigator lock so auth operations never queue behind each other.
    // Without this, every getUser()/getSession() call in every component serializes,
    // causing a multi-second lockup on page load in production.
    lock: (_name, _acquireTimeout, fn) => fn(),
  }
});

console.log('Supabase client created:', {
  hasAuth: !!supabase.auth,
  authMethods: supabase.auth ? Object.keys(supabase.auth) : []
});