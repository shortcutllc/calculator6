import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  MODE: z.enum(['development', 'production']).default('development'),
  PROD: z.boolean().default(false),
  DEV: z.boolean().default(true),
  BASE_URL: z.string().default('/')
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // Get environment variables from window.__ENV__ first, then fall back to import.meta.env
  const windowEnv = (window as any).__ENV__ || {};
  
  const env = {
    VITE_SUPABASE_URL: windowEnv.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: windowEnv.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    BASE_URL: '/'
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(e => e.path.join('.'))
        .join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export const config = {
  env: validateEnv(),
  app: {
    name: 'Shortcut Calculator',
    version: '1.0.0',
    baseUrl: 'https://calculator.getshortcut.co',
    apiTimeout: 30000,
    maxRequestsPerMinute: 100,
    allowedOrigins: [
      'https://calculator.getshortcut.co',
      'http://localhost:5173',
      'http://localhost:4173'
    ],
    routes: {
      home: '/',
      login: '/login',
      register: '/register',
      history: '/history',
      proposal: '/proposal/:id',
      shared: '/shared/:id'
    },
    security: {
      passwordMinLength: 6,
      maxLoginAttempts: 5,
      loginLockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      csrfTokenExpiry: 60 * 60 * 1000 // 1 hour
    }
  },
  supabase: {
    url: validateEnv().VITE_SUPABASE_URL,
    anonKey: validateEnv().VITE_SUPABASE_ANON_KEY
  }
} as const;