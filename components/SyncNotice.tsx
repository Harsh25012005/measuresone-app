import { SyncChip } from '../src/components/ui';
import { useSyncStatus } from '../lib/data/useSyncStatus';

/** Shows the sync chip only when something needs attention (offline, uploading or failed). */
export function SyncNotice() {
  const { status, pending } = useSyncStatus();
  if (status === 'synced') return null;
  return <SyncChip status={status} pending={pending} />;
}
