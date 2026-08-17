import 'dotenv/config';

const required = (name: string, fallback: string): string => {
  const v = process.env[name];
  if (v && v.trim().length > 0) return v.trim();
  if (name === 'JWT_SECRET' || name === 'DATABASE_URL') {
    console.warn(`[env] ${name} not set — using development fallback. Set it in backend/.env for production.`);
  }
  return fallback;
};

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL', ''),
  jwtSecret: required('JWT_SECRET', 'findsity-dev-secret-change-me-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};

export const isCloudinaryConfigured = (): boolean =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);