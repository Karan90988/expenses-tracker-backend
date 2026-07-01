import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../lib/db';

const SyncRecordSchema = z.object({
  id: z.string(),
  data: z.record(z.unknown()),
  operation: z.enum(['upsert', 'delete']),
  updatedAt: z.string(),
});

const MAX_RECORDS = 5000;
const MAX_REF_RECORDS = 500;

const SyncPayloadSchema = z.object({
  deviceId: z.string().min(1),
  syncedAt: z.string(),
  tables: z.object({
    expenses:         z.array(SyncRecordSchema).max(MAX_RECORDS),
    categories:       z.array(SyncRecordSchema).max(MAX_REF_RECORDS),
    paymentMethods:   z.array(SyncRecordSchema).max(MAX_REF_RECORDS),
    moneyLent:        z.array(SyncRecordSchema).max(MAX_RECORDS),
    lentPeople:       z.array(SyncRecordSchema).max(MAX_RECORDS).optional(),
    lentTransactions: z.array(SyncRecordSchema).max(MAX_RECORDS).optional(),
  }),
});

type Sql = ReturnType<typeof getDb>;
type SyncRecord = z.infer<typeof SyncRecordSchema>;

async function upsertExpense(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE expenses SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO expenses (id, amount, category_id, payment_method_id, note, date,
        is_deleted, device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.amount}, ${d.categoryId}, ${d.paymentMethodId},
        ${d.note ?? null}, ${d.date}, ${d.isDeleted ?? false}, ${deviceId},
        NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        amount            = EXCLUDED.amount,
        category_id       = EXCLUDED.category_id,
        payment_method_id = EXCLUDED.payment_method_id,
        note              = EXCLUDED.note,
        date              = EXCLUDED.date,
        is_deleted        = EXCLUDED.is_deleted,
        updated_at        = EXCLUDED.updated_at,
        last_synced_at    = NOW()
      WHERE expenses.updated_at < EXCLUDED.updated_at
    `;
  }
}

async function upsertCategory(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE categories SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO categories (id, name, icon, color, is_default, is_income, sort_order,
        is_deleted, device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.name}, ${d.icon}, ${d.color}, ${d.isDefault ?? false},
        ${d.isIncome ?? false}, ${d.sortOrder ?? 0}, ${d.isDeleted ?? false},
        ${deviceId}, NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        name       = EXCLUDED.name,
        icon       = EXCLUDED.icon,
        color      = EXCLUDED.color,
        is_default = EXCLUDED.is_default,
        is_income  = EXCLUDED.is_income,
        sort_order = EXCLUDED.sort_order,
        is_deleted = EXCLUDED.is_deleted,
        updated_at = EXCLUDED.updated_at,
        last_synced_at = NOW()
      WHERE categories.updated_at < EXCLUDED.updated_at
    `;
  }
}

async function upsertPaymentMethod(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE payment_methods SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO payment_methods (id, name, icon, sort_order, is_default, is_deleted,
        device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.name}, ${d.icon}, ${d.sortOrder ?? 0},
        ${d.isDefault ?? false}, ${d.isDeleted ?? false},
        ${deviceId}, NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        name       = EXCLUDED.name,
        icon       = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_default = EXCLUDED.is_default,
        is_deleted = EXCLUDED.is_deleted,
        updated_at = EXCLUDED.updated_at,
        last_synced_at = NOW()
      WHERE payment_methods.updated_at < EXCLUDED.updated_at
    `;
  }
}

async function upsertMoneyLent(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE money_lent SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO money_lent (id, person_name, amount, date_given, expected_return_date,
        status, returned_amount, returned_date, notes, is_deleted,
        device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.personName}, ${d.amount}, ${d.dateGiven},
        ${d.expectedReturnDate ?? null}, ${d.status ?? 'pending'},
        ${d.returnedAmount ?? 0}, ${d.returnedDate ?? null}, ${d.notes ?? null},
        ${d.isDeleted ?? false}, ${deviceId}, NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        person_name           = EXCLUDED.person_name,
        amount                = EXCLUDED.amount,
        date_given            = EXCLUDED.date_given,
        expected_return_date  = EXCLUDED.expected_return_date,
        status                = EXCLUDED.status,
        returned_amount       = EXCLUDED.returned_amount,
        returned_date         = EXCLUDED.returned_date,
        notes                 = EXCLUDED.notes,
        is_deleted            = EXCLUDED.is_deleted,
        updated_at            = EXCLUDED.updated_at,
        last_synced_at        = NOW()
      WHERE money_lent.updated_at < EXCLUDED.updated_at
    `;
  }
}

async function upsertLentPerson(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE lent_people SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO lent_people (id, name, notes, is_deleted,
        device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.name}, ${d.notes ?? null}, ${d.isDeleted ?? false},
        ${deviceId}, NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        name           = EXCLUDED.name,
        notes          = EXCLUDED.notes,
        is_deleted     = EXCLUDED.is_deleted,
        updated_at     = EXCLUDED.updated_at,
        last_synced_at = NOW()
      WHERE lent_people.updated_at < EXCLUDED.updated_at
    `;
  }
}

async function upsertLentTransaction(sql: Sql, record: SyncRecord, deviceId: string) {
  const d = record.data as any;
  if (record.operation === 'delete') {
    await sql`
      UPDATE lent_transactions SET is_deleted = true, updated_at = NOW()
      WHERE id = ${record.id}
    `;
  } else {
    await sql`
      INSERT INTO lent_transactions (id, person_id, type, amount, date, notes, is_deleted,
        device_id, last_synced_at, created_at, updated_at)
      VALUES (${record.id}, ${d.personId}, ${d.type ?? 'given'}, ${d.amount}, ${d.date},
        ${d.notes ?? null}, ${d.isDeleted ?? false},
        ${deviceId}, NOW(), ${d.createdAt}, ${d.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        person_id      = EXCLUDED.person_id,
        type           = EXCLUDED.type,
        amount         = EXCLUDED.amount,
        date           = EXCLUDED.date,
        notes          = EXCLUDED.notes,
        is_deleted     = EXCLUDED.is_deleted,
        updated_at     = EXCLUDED.updated_at,
        last_synced_at = NOW()
      WHERE lent_transactions.updated_at < EXCLUDED.updated_at
    `;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Shared-secret auth — set SYNC_SECRET in Vercel environment variables
  const syncSecret = process.env.SYNC_SECRET;
  if (syncSecret) {
    const provided = req.headers['x-sync-secret'];
    if (provided !== syncSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const parsed = SyncPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { deviceId, tables } = parsed.data;
  const sql = getDb();

  const lentPeople = tables.lentPeople ?? [];
  const lentTransactions = tables.lentTransactions ?? [];

  try {
    // Upsert parent tables first (categories, payment methods, lent people),
    // then their dependents (expenses, money_lent, lent transactions).
    await Promise.all([
      ...tables.categories.map((r) => upsertCategory(sql, r, deviceId)),
      ...tables.paymentMethods.map((r) => upsertPaymentMethod(sql, r, deviceId)),
      ...lentPeople.map((r) => upsertLentPerson(sql, r, deviceId)),
    ]);

    await Promise.all(tables.expenses.map((r) => upsertExpense(sql, r, deviceId)));
    await Promise.all(tables.moneyLent.map((r) => upsertMoneyLent(sql, r, deviceId)));
    await Promise.all(lentTransactions.map((r) => upsertLentTransaction(sql, r, deviceId)));

    const totalSynced =
      tables.expenses.length + tables.categories.length +
      tables.paymentMethods.length + tables.moneyLent.length +
      lentPeople.length + lentTransactions.length;

    return res.status(200).json({ success: true, recordsSynced: totalSynced });
  } catch (err) {
    console.error('[sync error]', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
