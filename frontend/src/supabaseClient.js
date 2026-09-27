import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log('DEBUG supabaseUrl:', JSON.stringify(supabaseUrl));
console.log('DEBUG supabaseKey exists:', Boolean(supabaseKey));

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const supabaseConfigError = !supabaseUrl || !supabaseKey;