import { act, renderHook, waitFor } from '@testing-library/react-native';

let mockNetListener: ((s: { isConnected: boolean }) => void) | null = null;
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (cb: (s: { isConnected: boolean }) => void) => {
      mockNetListener = cb;
      return () => {
        mockNetListener = null;
      };
    },
    fetch: jest.fn(),
  },
}));

let mockPending = 0;
jest.mock('../lib/data/db', () => ({
  getDb: async () => ({ getFirstAsync: async () => ({ n: mockPending }) }),
}));

import { setSyncRunState } from '../lib/data/syncStatus';
import { useSyncStatus } from '../lib/data/useSyncStatus';

describe('useSyncStatus', () => {
  beforeEach(() => {
    mockPending = 0;
    act(() => setSyncRunState('idle'));
  });

  it('is synced when online, idle and nothing is queued', async () => {
    const { result } = renderHook(() => useSyncStatus());
    await waitFor(() => expect(result.current).toEqual({ status: 'synced', pending: 0 }));
  });

  it('shows syncing while a sync run is in progress', async () => {
    const { result } = renderHook(() => useSyncStatus());
    act(() => setSyncRunState('syncing'));
    await waitFor(() => expect(result.current.status).toBe('syncing'));
  });

  it('shows the queued change count while changes wait to upload', async () => {
    mockPending = 3;
    const { result } = renderHook(() => useSyncStatus());
    await waitFor(() => expect(result.current).toEqual({ status: 'syncing', pending: 3 }));
  });

  it('shows offline when the connection drops, and failure after a failed run', async () => {
    const { result } = renderHook(() => useSyncStatus());
    act(() => mockNetListener?.({ isConnected: false }));
    await waitFor(() => expect(result.current.status).toBe('offline'));
    act(() => mockNetListener?.({ isConnected: true }));
    act(() => setSyncRunState('error'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
