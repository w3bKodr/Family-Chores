import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from '@expo/config';
import appJson from './app.json';

const envExtra = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
};

const baseConfig = {
  ...appJson.expo,
  plugins: appJson.expo.plugins as ExpoConfig['plugins'],
} as ExpoConfig;

const mergeExtra = (configExtra?: ExpoConfig['extra']) => ({
  ...baseConfig.extra,
  ...configExtra,
  ...envExtra,
});

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...baseConfig,
  ...config,
  extra: mergeExtra(config.extra),
});
