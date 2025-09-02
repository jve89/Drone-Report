// client/src/auth/AuthGuard.tsx
import { ReactNode } from "react";
import { useSession } from "./useSession";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { me, loading } = useSession();
  if (loading) return null;
  if (!me) {
    window.location.href = "/login";
    return null;
  }
  return <>{children}</>;
}
