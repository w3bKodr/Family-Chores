import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoExtra = (Constants?.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  expoExtra.EXPO_PUBLIC_SUPABASE_URL ??
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials in environment variables');
}

// Use AsyncStorage for web, don't use SecureStore (not available on web)
const storage = Platform.OS === 'web' ? AsyncStorage : AsyncStorage;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export type Database = any;
