import { createContext, useContext, type ReactNode } from "react";
import { useCall, type UseCallReturn } from "./useCall";

const CallContext = createContext<UseCallReturn | null>(null);

export function useCallContext(): UseCallReturn {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const call = useCall();
  return <CallContext.Provider value={call}>{children}</CallContext.Provider>;
}
