// Workstream B: semantic cache lookup logic for /api/generate.
// db and embed are injected so tests can run without network.
const defaultDb = require('./db');

const SERVE_THRESHOLD = 0.90;
const NEAR_MISS_THRESHOLD = 0.80;

function normalizeQuery(query) {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Contract: requests carrying user context/code never touch the shared cache.
function shouldSkipCache(body) {
    return Boolean(body.context || body.code);
}

// Lookup flow: exact match → on miss, embed + pgvector cosine search.
// Serves only similarity ≥ 0.90; logs 0.80–0.90 as near-misses without serving.
// Returns { hit, matchType, embedding } — embedding is reused for the insert on miss.
async function lookupCache({ query, promptVersion, embed, db = defaultDb }) {
    const normalized = normalizeQuery(query);

    const exact = await db.getCacheExact(normalized, promptVersion);
    if (exact) {
        return { hit: exact, matchType: 'exact', embedding: null };
    }

    let embedding = null;
    try {
        embedding = await embed(normalized);
    } catch (e) {
        console.error('[cache] Embedding failed, skipping semantic lookup:', e.message);
        return { hit: null, matchType: null, embedding: null };
    }

    const matches = await db.matchVizCache(embedding, promptVersion);
    const best = matches[0];
    if (best && best.similarity >= SERVE_THRESHOLD) {
        return { hit: best, matchType: 'semantic', embedding };
    }

    for (const m of matches) {
        if (m.similarity >= NEAR_MISS_THRESHOLD && m.similarity < SERVE_THRESHOLD) {
            console.log(
                `[cache] near-miss (not served): "${normalized}" ~ "${m.query_normalized}" similarity=${m.similarity.toFixed(3)}`
            );
        }
    }

    return { hit: null, matchType: null, embedding };
}

// Fresh-first quiz with stored fallback: always try to generate; on success
// store the result on the topic's cache row (overwriting, so the fallback
// stays recent); on failure serve the stored quiz if one exists, else rethrow.
async function quizWithFallback({ topic, generate, enabled = true, db = defaultDb }) {
    if (!enabled) {
        return { quiz: await generate(), fallback: false };
    }
    const row = await db.getQuizCacheRow(normalizeQuery(topic));
    try {
        const quiz = await generate();
        if (row) db.storeQuizOnCacheRow(row.id, quiz); // fire-and-forget
        return { quiz, fallback: false };
    } catch (e) {
        if (row && row.quiz) {
            console.log(`[quiz] generation failed (${e.message}) — serving stored fallback`);
            return { quiz: row.quiz, fallback: true };
        }
        throw e;
    }
}

module.exports = {
    normalizeQuery,
    shouldSkipCache,
    lookupCache,
    quizWithFallback,
    SERVE_THRESHOLD,
    NEAR_MISS_THRESHOLD,
};
