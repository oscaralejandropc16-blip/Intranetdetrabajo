import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uimuiqebgdettgmaebhi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbXVpcWViZ2RldHRnbWFlYmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDU4MDQsImV4cCI6MjEwNTkyMTgwNH0.Ewq0nlX3THfBsltkqrScG-2Lb6ONskvZ_n_rh9mnREg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
