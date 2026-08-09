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

module.exports = { supabase, logGenerationFailure };
