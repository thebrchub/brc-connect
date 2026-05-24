import { api } from "./client";
import { getUserRole } from "../hooks/useRole";

let sessionId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat() {
  try {
    const res = await api.post<{ session_id: string }>("/crm/heartbeat", {
      session_id: sessionId,
    });
    sessionId = res.session_id;
  } catch {
    // silent fail — heartbeat is non-critical
  }
}

export function startHeartbeat() {
  if (heartbeatInterval) return;
  const role = getUserRole();
  if (role !== "employee") return;

  sendHeartbeat();
  heartbeatInterval = setInterval(sendHeartbeat, 60_000);

  document.addEventListener("visibilitychange", handleVisibility);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  document.removeEventListener("visibilitychange", handleVisibility);
  sessionId = null;
}

function handleVisibility() {
  if (!document.hidden) {
    sendHeartbeat();
  }
}
