
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// Fallback to avoid immediate crash if env vars are missing
const cleanUrl = supabaseUrl || 'https://placeholder.supabase.co';
const cleanKey = supabaseKey || 'placeholder';

export const supabase = createClient(cleanUrl, cleanKey);
