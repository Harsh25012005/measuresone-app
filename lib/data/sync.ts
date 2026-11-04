import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase';
import { getDb, runExclusive, SYNCED_ENTITIES, type SyncedEntity } from './db';

/**
 * Column list per entity, used both to build the Supabase `select()` and to
 * bind SQLite upsert params — keeping one source of truth avoids the two
 * getting out of sync as columns are added.
 */
const ENTITY_COLUMNS: Record<SyncedEntity, string[]> = {
  customers: ['id', 'shop_id', 'name', 'phone', 'address', 'created_at', 'updated_at'],
  orders: [
    'id', 'shop_id', 'order_number', 'customer_id', 'cloth_type', 'cloth_count',
    'design_photo_url', 'design_photo_urls', 'measurement_id', 'order_date',
    'delivery_date', 'trial_date', 'status', 'priority', 'is_rush', 'rush_fee',
    'assigned_staff_id', 'bill_book_number', 'total_amount', 'paid_amount',
    'payment_mode', 'created_at', 'updated_at',
  ],
  order_items: ['id', 'shop_id', 'order_id', 'garment_type', 'cloth_count', 'unit_price', 'notes', 'measurement_id', 'created_at'],
  staff: [
    'id', 'shop_id', 'name', 'phone', 'role', 'wage_type', 'wage_amount',
    'wage_amount_pant', 'wage_amount_shirt', 'wage_amount_pair', 'is_active',
    'created_at', 'updated_at',
  ],
  bills: ['id', 'shop_id', 'order_id', 'customer_id', 'fabric_cost', 'stitching_charge', 'discount', 'tax', 'total_amount', 'payment_status', 'created_at', 'updated_at'],
  payments: ['id', 'shop_id', 'bill_id', 'customer_id', 'amount_paid', 'payment_mode', 'payment_date'],
  universal_measurement_templates: ['id', 'shop_id', 'template_name', 'sort_order', 'created_at', 'updated_at'],
  universal_measurement_fields: ['id', 'template_id', 'field_name', 'sort_order', 'created_at'],
  customer_measurements: ['id', 'customer_id', 'template_id', 'measurements', 'created_at', 'updated_at'],
};

// order_items, payments and universal_measurement_fields have no updated_at column server-side — fall back
// to created_at as the sync watermark for those.
const WATERMARK_COLUMN: Record<SyncedEntity, string> = {
  customers: 'updated_at',
  orders: 'updated_at',
  order_items: 'created_at',
  staff: 'updated_at',
  bills: 'updated_at',
  payments: 'payment_date',
  universal_measurement_templates: 'updated_at',
  universal_measurement_fields: 'created_at',
  customer_measurements: 'updated_at',
};

function toSqliteValue(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v as string | number;
}

async function pullEntity(shopId: string, entity: SyncedEntity) {
  const db = await getDb();
  const meta = await db.getFirstAsync<{ last_synced_at: string | null }>(
    'select last_synced_at from sync_meta where entity = ?',
    [entity]
  );
  const watermarkCol = WATERMARK_COLUMN[entity];
  const columns = ENTITY_COLUMNS[entity];

  let query = (supabase.from(entity) as any).select(columns.join(','));
  if (columns.includes('shop_id')) {
    query = query.eq('shop_id', shopId);
  }
  if (meta?.last_synced_at) {
    query = query.gt(watermarkCol, meta.last_synced_at);
  }
  const { data: rawData, error } = await query;
  if (error) throw error;
  const data = rawData as unknown as Record<string, unknown>[] | null;
  if (!data || data.length === 0) {
    await db.runAsync(
      'insert into sync_meta (entity, last_synced_at) values (?, ?) on conflict(entity) do update set last_synced_at = excluded.last_synced_at',
      [entity, new Date().toISOString()]
    );
    return;
  }

  const placeholders = columns.map(() => '?').join(',');
  const updateAssignments = columns.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  const sql = `insert into ${entity} (${columns.join(',')}) values (${placeholders})
    on conflict(id) do update set ${updateAssignments}`;

  await runExclusive(() =>
    db.withTransactionAsync(async () => {
      for (const row of data) {
        const params = columns.map((c) => toSqliteValue(row[c]));
        await db.runAsync(sql, params);
      }
    })
  );

  let maxWatermark = meta?.last_synced_at ?? '';
  for (const row of data) {
    const v = row[watermarkCol] as string | undefined;
    if (v && v > maxWatermark) maxWatermark = v;
  }
  await db.runAsync(
    'insert into sync_meta (entity, last_synced_at) values (?, ?) on conflict(entity) do update set last_synced_at = excluded.last_synced_at',
    [entity, maxWatermark || new Date().toISOString()]
  );
}

type PendingOp = { op_id: string; entity: string; row_id: string; op_type: string; payload: string };

/** Postgres error codes, as surfaced by PostgREST. */
const FK_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';

async function pushOp(op: PendingOp): Promise<void> {
  const payload = JSON.parse(op.payload);
  const table = op.entity as SyncedEntity;
  if (op.op_type === 'insert') {
    const { error } = await supabase.from(table).insert(payload);
    // Already on the server (e.g. a previous push landed but the local
    // bookkeeping didn't) — treat as done instead of blocking the queue.
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
  } else if (op.op_type === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id);
    if (error) throw error;
  } else {
    const { id, ...rest } = payload;
    const { error } = await supabase.from(table).update(rest).eq('id', id);
    if (error) throw error;
  }
}

async function pushPendingOps() {
  const db = await getDb();
  let ops = await db.getAllAsync<PendingOp>('select * from pending_ops order by created_at asc');

  // Push in queue order. An op that fails on a foreign key (e.g. an
  // order_item queued ahead of its order) is deferred and retried after the
  // rest, for as long as each pass still makes progress — otherwise one
  // mis-ordered op would block every later change forever. Any other error
  // stops the run so dependent ops keep their order; it retries next sync.
  while (ops.length > 0) {
    const deferred: PendingOp[] = [];
    let progressed = false;
    for (const op of ops) {
      try {
        await pushOp(op);
        await db.runAsync('delete from pending_ops where op_id = ?', [op.op_id]);
        progressed = true;
      } catch (err) {
        if ((err as { code?: string })?.code === FK_VIOLATION) {
          deferred.push(op);
          continue;
        }
        console.warn('[sync] push failed, will retry on next sync:', op.entity, op.op_id, err);
        return;
      }
    }
    if (!progressed) {
      if (deferred.length > 0) {
        console.warn('[sync] ops still blocked by missing references, will retry on next sync:', deferred.map((o) => `${o.entity}:${o.op_id}`));
      }
      return;
    }
    ops = deferred;
  }
}

let inFlight: Promise<void> | null = null;

/**
 * Pushes queued local writes, then pulls server changes. Concurrent callers
 * share the run already in progress, so `await runSync()` always means "a
 * sync has finished" rather than returning early while one is mid-flight.
 */
export function runSync(shopId: string): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    await pushPendingOps();
    for (const entity of SYNCED_ENTITIES) {
      await pullEntity(shopId, entity);
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let unsubscribeNetInfo: (() => void) | null = null;

/** Wires up sync-on-reconnect and sync-on-foreground; call once from a root provider. */
export function startAutoSync(shopId: string) {
  stopAutoSync();
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected) runSync(shopId).catch((err) => console.warn('[sync] failed:', err));
  });
  runSync(shopId).catch((err) => console.warn('[sync] failed:', err));
}

export function stopAutoSync() {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
}
