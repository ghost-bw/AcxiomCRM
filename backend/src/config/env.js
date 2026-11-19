import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/acxiomcrm',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'acxiom_crm_super_secret_jwt_access_token_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'acxiom_crm_super_secret_jwt_refresh_token_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  LOCKOUT_ATTEMPTS_LIMIT: process.env.LOCKOUT_ATTEMPTS_LIMIT ? parseInt(process.env.LOCKOUT_ATTEMPTS_LIMIT, 10) : 5,
  LOCKOUT_DURATION_MINUTES: process.env.LOCKOUT_DURATION_MINUTES ? parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) : 15,
};
