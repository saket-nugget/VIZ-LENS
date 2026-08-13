// Minimal in-memory sliding-window rate limiter (per key, e.g. IP).
// now is injectable for tests.
function createRateLimiter({ limit, windowMs }) {
    const hits = new Map(); // key -> [timestamps within window]
    return function allow(key, now = Date.now()) {
        const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
        if (recent.length >= limit) {
            hits.set(key, recent);
            return false;
        }
        recent.push(now);
        hits.set(key, recent);
        return true;
    };
}

module.exports = { createRateLimiter };
