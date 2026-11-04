import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Lets a screen with a full-bleed header (the blue hero on sign-in and
 * onboarding) turn off the white strip App.tsx paints behind the status bar,
 * and flip the status-bar icons to light. Restores itself on unmount.
 */
type Value = {
  /** true while a hero screen wants the status-bar area left transparent. */
  heroActive: boolean;
  setHeroActive: (v: boolean) => void;
};

const Ctx = createContext<Value | null>(null);

export function StatusBarProvider({ children }: { children: ReactNode }) {
  const [heroActive, setHeroActiveState] = useState(false);
  const setHeroActive = useCallback((v: boolean) => setHeroActiveState(v), []);
  const value = useMemo(() => ({ heroActive, setHeroActive }), [heroActive, setHeroActive]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStatusBarHero(): boolean {
  return useContext(Ctx)?.heroActive ?? false;
}

/** Call from a hero screen: marks it active while mounted. */
export function useHeroStatusBar() {
  const ctx = useContext(Ctx);
  const set = ctx?.setHeroActive;
  useEffect(() => {
    set?.(true);
    return () => set?.(false);
  }, [set]);
}
