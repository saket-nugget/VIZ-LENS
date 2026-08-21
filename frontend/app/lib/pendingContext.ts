// Read-once sessionStorage handoff for grounding context: the home page
// writes it right before navigating to /viz (a plain in-memory ref would not
// survive that full route change), and /viz consumes + immediately clears it
// on the very next generation. Never persisted beyond that single request —
// matches "your notes aren't stored."
export const PENDING_CONTEXT_KEY = "vl_pending_context";
