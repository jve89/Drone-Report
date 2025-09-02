// client/src/auth/useSession.ts
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

type Me = { id: string; email?: string } | null;
type Resp = { user?: Me };

export function useSession() {
  const [me, setMe] = useState<Me>(undefined as any);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then(r => (r.ok ? r.json() as Promise<Resp> : null))
      .then(data => { if (mounted) setMe(data?.user ?? null); })
      .catch(() => { if (mounted) setMe(null); });
    return () => { mounted = false; };
  }, []);

  return { me, loading: me === (undefined as any) };
}
