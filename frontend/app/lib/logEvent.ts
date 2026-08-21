// Fire-and-forget frontend telemetry over the shared feature_events pattern
// (backend/db.js logEvent, POST /api/event). Never blocks the UI — a failed
// telemetry call must never affect what the user sees.
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export function logEvent(name: string, payload: Record<string, unknown> = {}) {
  fetch(`${API_BASE_URL}/api/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, payload }),
  }).catch(() => {});
}
