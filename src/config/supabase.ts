import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// In production, these would come from environment variables
// For Lovable preview, we use the provided values directly

export const SUPABASE_CONFIG = {
  url: 'https://lfsmtsnakdaukxgrqynk.supabase.co',
  publishableKey: 'sb_publishable_3PpJbPZ77rRL3B2kaaTcpw_0caAY6AS',
  projectId: 'lfsmtsnakdaukxgrqynk',
};

// Use environment variables if available, otherwise use config
export const getSupabaseUrl = () => {
  return import.meta.env.VITE_SUPABASE_URL || SUPABASE_CONFIG.url;
};

export const getSupabasePublishableKey = () => {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_CONFIG.publishableKey;
};

// Create and export Supabase client
export const supabase = createClient(
  getSupabaseUrl(),
  getSupabasePublishableKey()
);
