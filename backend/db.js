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
};
