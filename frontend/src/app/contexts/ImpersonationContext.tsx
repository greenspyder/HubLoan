import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ImpersonationContextValue = {
  impersonatedClientId: number | null;
  impersonateClient: (clientId: number) => void;
  clearImpersonation: () => void;
};

const storageKey = "credito-simulador-impersonated-client";

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined);

function readStoredClientId() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return null;
  }

  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedClientId, setImpersonatedClientId] = useState<number | null>(readStoredClientId);

  useEffect(() => {
    if (impersonatedClientId === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(impersonatedClientId));
  }, [impersonatedClientId]);

  const value = useMemo<ImpersonationContextValue>(() => ({
    impersonatedClientId,
    impersonateClient: (clientId: number) => setImpersonatedClientId(clientId),
    clearImpersonation: () => setImpersonatedClientId(null),
  }), [impersonatedClientId]);

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);

  if (!context) {
    throw new Error("useImpersonation deve ser usado dentro de ImpersonationProvider");
  }

  return context;
}