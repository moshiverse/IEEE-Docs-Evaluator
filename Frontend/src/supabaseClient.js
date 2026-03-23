import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Missing required Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the frontend environment.'
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);