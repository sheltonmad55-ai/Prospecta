import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  apiKey: process.env.API_KEY || process.env.WHATSAPP_SERVICE_KEY || 'prospecta_secret_key_change_me',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  timezone: process.env.TZ || 'Africa/Maputo',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || '').toLowerCase() === 'production',
  disableRestore: process.env.WA_DISABLE_RESTORE === 'true' || process.env.DISABLE_RESTORE === 'true',
};


