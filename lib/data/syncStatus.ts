/**
 * Observable state of the sync engine, for the header sync chip. Read-only for
 * the UI: only `runSync` (sync.ts) writes it.
 */
export type SyncRunState = 'idle' | 'syncing' | 'error';

let state: SyncRunState = 'idle';
const listeners = new Set<() => void>();

export function getSyncRunState(): SyncRunState {
  return state;
}

export function setSyncRunState(next: SyncRunState) {
  if (state === next) return;
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeSyncRunState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
