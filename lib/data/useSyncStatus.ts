import { useEffect, useState, useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getDb } from './db';
import { getSyncRunState, subscribeSyncRunState } from './syncStatus';

export type SyncChipStatus = 'synced' | 'syncing' | 'offline' | 'error';

const POLL_MS = 4000;

/**
 * Sync status for the header chip: offline, syncing, failed, or synced, plus
 * how many local changes are still waiting to be uploaded. Read-only; it only
 * observes NetInfo, the sync run state and the pending_ops count.
 */
export function useSyncStatus(): { status: SyncChipStatus; pending: number } {
  const run = useSyncExternalStore(subscribeSyncRunState, getSyncRunState, getSyncRunState);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)), []);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const db = await getDb();
        const row = await db.getFirstAsync<{ n: number }>('select count(*) as n from pending_ops');
        if (!cancelled) setPending(row?.n ?? 0);
      } catch {
        // Counting is best-effort; keep the last known value.
      }
    };
    void read();
    const id = setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [run]);

  // Online and idle but with changes still queued means an upload is waiting for the next sync run.
  const status: SyncChipStatus = !online ? 'offline' : run === 'error' ? 'error' : run === 'syncing' || pending > 0 ? 'syncing' : 'synced';
  return { status, pending };
}
