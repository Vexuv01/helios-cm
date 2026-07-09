import { supabase } from "../../../lib/supabaseClient";

export async function getSession() {
  return supabase.auth.getSession();
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email);
}
