import { supabase } from '../supabaseClient';

export async function signOut() {
  await supabase.auth.signOut();
}
