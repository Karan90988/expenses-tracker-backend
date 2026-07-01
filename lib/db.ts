import { neon } from '@neondatabase/serverless';

let sqlInstance: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!sqlInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    sqlInstance = neon(url);
  }
  return sqlInstance;
}
