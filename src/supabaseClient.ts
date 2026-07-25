/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://orevazfyhtaujfxpvzvx.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper function to test connection
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Attempt a lightweight query to verify connection
    // We try to fetch 1 row from 'campaign' or check connection
    const { data, error } = await supabase.from('campaign').select('id').limit(1);
    if (error) {
      // If error is code PGRST116 or table not found, connection is working but schema might be blank
      if (error.code === '42P01') {
        return { success: true, message: "Connected to Supabase! (Some tables may not be initialized yet)" };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: "Successfully connected to Supabase database!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Unknown connection error" };
  }
}
