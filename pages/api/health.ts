import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'error', message: err.message });
  }
}
