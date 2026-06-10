import 'react-native-get-random-values';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

const isProjectUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl);
const hasPlaceholderKey = !supabasePublishableKey || supabasePublishableKey.includes('your_');

export const supabaseConfigError = (() => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the app.';
  }

  if (supabaseUrl === 'https://supabase.com' || supabaseUrl === 'https://supabase.com/') {
    return 'EXPO_PUBLIC_SUPABASE_URL must be your project URL, like https://project-ref.supabase.co, not https://supabase.com/.';
  }

  if (!isProjectUrl) {
    return 'EXPO_PUBLIC_SUPABASE_URL must look like https://project-ref.supabase.co.';
  }

  if (hasPlaceholderKey) {
    return 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be the publishable key from your Supabase project.';
  }

  return null;
})();

export const isSupabaseConfigured = !supabaseConfigError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web' && AppState?.addEventListener) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
