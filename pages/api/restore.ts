import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/db';

/**
 * Returns every row from the cloud backup so the app can rebuild its local
 * SQLite database (e.g. after a fresh install or on a new device).
 * Read-only. Tables that don't exist yet resolve to empty arrays.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const secret = process.env.SYNC_SECRET;
  if (secret && req.headers['x-sync-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = getDb();

  const rows = async (run: Promise<any>): Promise<any[]> => {
    try { return (await run) as any[]; } catch { return []; }
  };

  try {
    const [categories, paymentMethods, expenses, moneyLent, lentPeople, lentTransactions, settings] =
      await Promise.all([
        rows(sql`SELECT * FROM categories`),
        rows(sql`SELECT * FROM payment_methods`),
        rows(sql`SELECT * FROM expenses`),
        rows(sql`SELECT * FROM money_lent`),
        rows(sql`SELECT * FROM lent_people`),
        rows(sql`SELECT * FROM lent_transactions`),
        rows(sql`SELECT * FROM settings LIMIT 1`),
      ]);

    return res.status(200).json({
      categories,
      paymentMethods,
      expenses,
      moneyLent,
      lentPeople,
      lentTransactions,
      settings: settings[0] ?? null,
    });
  } catch (err) {
    console.error('[restore error]', err);
    return res.status(500).json({ error: 'Restore failed' });
  }
}
