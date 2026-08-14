// Supabase client (backend-only: uses the secret service key, never expose to browser)
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = url && serviceKey ? createClient(url, serviceKey) : null;

if (!supabase) {
    console.warn('[db] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — failure logging disabled');
}

// stage: 'static' | 'runtime' | 'repair_static' | 'repair_runtime'
async function logGenerationFailure({ query, stage, error, repaired = false }) {
    if (!supabase) {
        console.warn(`[generation_failure] stage=${stage} repaired=${repaired} query=${query}: ${error}`);
        return;
    }
    try {
        const { error: dbError } = await supabase
            .from('generation_failures')
            .insert({ query, stage, error, repaired });
        if (dbError) console.error('[db] Failed to log generation failure:', dbError.message);
    } catch (e) {
        console.error('[db] Failed to log generation failure:', e.message);
    }
}

// --- viz_cache operations (Workstream B) ---
// All return null / no-op when Supabase is not configured or errors — the
// cache must never break generation.

async function getCacheExact(queryNormalized, promptVersion) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('viz_cache')
            .select('id, slug, query_raw, query_normalized, topic, html, prompt_version, repaired, hit_count')
            .eq('query_normalized', queryNormalized)
            .eq('prompt_version', promptVersion)
            .limit(1)
            .maybeSingle();
        if (error) {
            console.error('[db] Exact cache lookup failed:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error('[db] Exact cache lookup failed:', e.message);
        return null;
    }
}

// Cosine similarity search via the match_viz_cache Postgres function
// (see docs/sql/match_viz_cache.sql). Returns [{...row, similarity}] sorted best-first.
async function matchVizCache(embedding, promptVersion, matchCount = 3) {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.rpc('match_viz_cache', {
            query_embedding: embedding,
            target_prompt_version: promptVersion,
            match_count: matchCount,
        });
        if (error) {
            console.error('[db] Semantic cache lookup failed:', error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('[db] Semantic cache lookup failed:', e.message);
        return [];
    }
}

async function insertVizCache(row) {
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('viz_cache').insert(row);
        if (error) {
            console.error('[db] Cache insert failed:', error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[db] Cache insert failed:', e.message);
        return false;
    }
}

async function getCacheBySlug(slug) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('viz_cache')
            .select('html, query_raw, created_at')
            .eq('slug', slug)
            .maybeSingle();
        if (error) {
            console.error('[db] Slug lookup failed:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error('[db] Slug lookup failed:', e.message);
        return null;
    }
}

// Growth analytics — fire-and-forget, never blocks the response
async function logShareOpen(slug) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('share_opens').insert({ slug });
        if (error) console.error('[db] share_opens insert failed:', error.message);
    } catch (e) {
        console.error('[db] share_opens insert failed:', e.message);
    }
}

// Generic feature telemetry (feature_events table) — one helper for all
// streams; add event names, not tables. Fire-and-forget, never blocks.
async function logEvent(name, payload = {}) {
    if (!supabase) {
        console.log(`[event] ${name}`, JSON.stringify(payload));
        return;
    }
    try {
        const { error } = await supabase.from('feature_events').insert({ name, payload });
        if (error) console.error('[db] logEvent failed:', error.message);
    } catch (e) {
        console.error('[db] logEvent failed:', e.message);
    }
}

// Quiz storage lives on the topic's cache row. Deliberately NOT filtered by
// prompt_version: quiz content depends on the topic, not the viz prompt, so
// older rows still provide a usable fallback.
async function getQuizCacheRow(queryNormalized) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('viz_cache')
            .select('id, quiz')
            .eq('query_normalized', queryNormalized)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            console.error('[db] Quiz cache lookup failed:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error('[db] Quiz cache lookup failed:', e.message);
        return null;
    }
}

// Overwrites any previously stored quiz so the fallback stays recent
async function storeQuizOnCacheRow(id, quiz) {
    if (!supabase) return;
    try {
        const { error } = await supabase.from('viz_cache').update({ quiz }).eq('id', id);
        if (error) console.error('[db] Quiz store failed:', error.message);
    } catch (e) {
        console.error('[db] Quiz store failed:', e.message);
    }
}

// Read-modify-write off the already-fetched row; a lost increment under
// concurrency is acceptable for hit analytics.
async function incrementHitCount(row) {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('viz_cache')
            .update({ hit_count: (row.hit_count || 0) + 1 })
            .eq('id', row.id);
        if (error) console.error('[db] hit_count update failed:', error.message);
    } catch (e) {
        console.error('[db] hit_count update failed:', e.message);
    }
}

module.exports = {
    supabase,
    logGenerationFailure,
    getCacheExact,
    matchVizCache,
    insertVizCache,
    incrementHitCount,
    getCacheBySlug,
    logShareOpen,
    getQuizCacheRow,
    storeQuizOnCacheRow,
    logEvent,
};
