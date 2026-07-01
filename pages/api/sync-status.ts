import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const sql = getDb();
    const [counts] = (await sql`
      SELECT
        (SELECT COUNT(*)::int FROM expenses   WHERE is_deleted = false) as expenses,
        (SELECT COUNT(*)::int FROM categories  WHERE is_deleted = false) as categories,
        (SELECT COUNT(*)::int FROM money_lent  WHERE is_deleted = false) as money_lent
    `) as Array<{ expenses: number; categories: number; money_lent: number }>;
    res.status(200).json({ status: 'ok', counts, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[sync-status error]', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
