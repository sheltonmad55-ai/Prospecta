import dotenv from 'dotenv';
dotenv.config();

const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const rawApiKey = (process.env.API_KEY || process.env.WHATSAPP_SERVICE_KEY || '').trim();

if (isProd && (!rawApiKey || rawApiKey === 'prospecta_secret_key_change_me')) {
  throw new Error('FATAL: Em ambiente de produção, API_KEY ou WHATSAPP_SERVICE_KEY não pode estar vazia nem usar o valor de exemplo.');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  apiKey: rawApiKey || 'prospecta_secret_key_change_me',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  timezone: process.env.TZ || 'Africa/Maputo',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: isProd,
  disableRestore: process.env.WA_DISABLE_RESTORE === 'true' || process.env.DISABLE_RESTORE === 'true',
};


