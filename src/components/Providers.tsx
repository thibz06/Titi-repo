"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";

export type SessionState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "ready"; userId: string }
  | { status: "error" };

const SessionContext = createContext<SessionState>({ status: "loading" });
export const useSession = () => useContext(SessionContext);

/** Ouvre une session anonyme au premier lancement, puis la réutilise. */
function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => (getSupabase() ? { status: "loading" } : { status: "unconfigured" }));

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (data.session) return setState({ status: "ready", userId: data.session.user.id });
      const { data: created, error } = await sb.auth.signInAnonymously();
      if (cancelled) return;
      setState(error || !created.user ? { status: "error" } : { status: "ready", userId: created.user.id });
    })().catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <SessionProvider>{children}</SessionProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
