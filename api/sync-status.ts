import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        (SELECT COUNT(*) FROM expenses  WHERE is_deleted = false) as expenses,
        (SELECT COUNT(*) FROM categories WHERE is_deleted = false) as categories,
        (SELECT COUNT(*) FROM money_lent WHERE is_deleted = false) as money_lent
    `;
    res.status(200).json({ status: 'ok', counts: rows[0], timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
