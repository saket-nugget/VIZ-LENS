// Verifier test script — run with: node test/run_verifier_tests.js (from backend/)
// No API key or network needed: the repair test uses a mocked generate function.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runStaticChecks, runSmokeTest, verify, closeBrowser, VerificationError, hasCommandBridge } = require('../verifier');
const { normalizeQuery, shouldSkipCache, lookupCache, quizWithFallback } = require('../cache');
const { createRateLimiter } = require('../rateLimit');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✓ ${name}`);
    } else {
        failed++;
        console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

async function main() {
    const good = fixture('good.html');

    // --- Static checks ---
    console.log('Static checks:');
    check('good.html passes', runStaticChecks(good).pass);

    const staticCases = [
        ['bad-missing-canvas.html', 'canvas'],
        ['bad-entities.html', 'escaped-entities'],
        ['bad-localstorage.html', 'forbidden-storage'],
    ];
    for (const [name, expectedCheck] of staticCases) {
        const result = runStaticChecks(fixture(name));
        const hit = !result.pass && result.failures.some(f => f.check === expectedCheck);
        check(`${name} fails on ${expectedCheck}`, hit, JSON.stringify(result.failures));
    }
    check('bad-runtime-error.html passes static (fails only at runtime)',
        runStaticChecks(fixture('bad-runtime-error.html')).pass);

    // Forbidden-storage is scoped to <script> contents: mere mentions in
    // display text or comments must not fail (or burn a repair attempt)
    const mentionsStorage = `<html><body><canvas></canvas>
        <div id="description-box">Unlike localStorage, this algorithm keeps state in memory.</div>
        <!-- note: sessionStorage is unavailable in the sandbox -->
        <button id="take-quiz-btn"></button>
        <script>const state = { steps: [] };</script></body></html>`;
    check('localStorage mentioned outside scripts passes', runStaticChecks(mentionsStorage).pass);

    // Doubled UI: the whole interface stamped out twice (live photosynthesis bug)
    const doubledUi = `<html><body>
        <canvas></canvas><div id="description-box">copy one</div><button id="take-quiz-btn"></button>
        <canvas></canvas><div id="description-box">copy two</div><button id="take-quiz-btn"></button>
        <script>const x = 1;</script></body></html>`;
    check('duplicated UI (repeated required ids) fails static checks',
        runStaticChecks(doubledUi).failures.some(f => f.check === 'duplicate-ui'));
    const usesStorage = mentionsStorage.replace('const state = { steps: [] };', 'localStorage.setItem("k","v");');
    check('localStorage used inside a script still fails',
        runStaticChecks(usesStorage).failures.some(f => f.check === 'forbidden-storage'));

    // --- Smoke test ---
    console.log('Smoke test:');
    const goodSmoke = await runSmokeTest(good);
    check('good.html passes smoke test', goodSmoke.pass, JSON.stringify(goodSmoke.failures));

    const badSmoke = await runSmokeTest(fixture('bad-runtime-error.html'));
    check('bad-runtime-error.html fails smoke test on Next click',
        !badSmoke.pass && badSmoke.failures.some(f => f.check === 'runtime-next'),
        JSON.stringify(badSmoke.failures));

    // Silently-blank canvas: no errors, description updates, nothing drawn
    check('bad-blank-canvas.html passes static checks',
        runStaticChecks(fixture('bad-blank-canvas.html')).pass);
    const blankSmoke = await runSmokeTest(fixture('bad-blank-canvas.html'));
    check('bad-blank-canvas.html fails smoke test on never-painted canvas',
        !blankSmoke.pass && blankSmoke.failures.some(f => f.check === 'runtime-blank-canvas'),
        JSON.stringify(blankSmoke.failures));

    // --- Repair loop (mocked generate: "repairs" by returning the good fixture) ---
    console.log('Repair loop:');
    let repairPrompt = null;
    const mockGenerate = async (prompt) => { repairPrompt = prompt; return good; };

    const repairedResult = await verify(fixture('bad-missing-canvas.html'), {
        query: 'test: repairable',
        generate: mockGenerate,
    });
    check('failing HTML is repaired once and verifies',
        repairedResult.verified === true && repairedResult.repaired === true);
    check('repair prompt includes failing check and error',
        repairPrompt !== null && repairPrompt.includes('static') && repairPrompt.includes('canvas'));

    const cleanResult = await verify(good, {
        query: 'test: already valid',
        generate: async () => { throw new Error('generate must not be called for valid HTML'); },
    });
    check('valid HTML verifies without repair',
        cleanResult.verified === true && cleanResult.repaired === false);

    let threw = false;
    try {
        await verify(fixture('bad-missing-canvas.html'), {
            query: 'test: unrepairable',
            generate: async () => fixture('bad-runtime-error.html'), // "repair" is also broken
        });
    } catch (e) {
        threw = e instanceof VerificationError;
    }
    check('still-broken repair throws VerificationError', threw);

    await closeBrowser();

    // --- Cache logic (mocked db + embed, no network) ---
    console.log('Cache logic:');

    check('normalizeQuery trims, lowercases, collapses whitespace',
        normalizeQuery('  Bubble   SORT \n algo  ') === 'bubble sort algo');
    check('filler words strip to one cache key',
        normalizeQuery('Bubble Sort Algorithm') === 'bubble sort' &&
        normalizeQuery('visualize bubble sort') === 'bubble sort' &&
        normalizeQuery('show me bubble sort please') === 'bubble sort');
    check('articles are not stripped (A* stays distinct from star)',
        normalizeQuery('a star algorithm') === 'a star' &&
        normalizeQuery('a star') !== normalizeQuery('star'));
    check('all-filler query keeps its base form',
        normalizeQuery('  Visualization ') === 'visualization');

    check('shouldSkipCache: plain query uses cache', shouldSkipCache({ query: 'x' }) === false);
    check('shouldSkipCache: context field skips cache', shouldSkipCache({ query: 'x', context: 'notes' }) === true);
    check('shouldSkipCache: user code skips cache', shouldSkipCache({ query: 'x', code: 'for(;;)' }) === true);

    const FAKE_EMBEDDING = [0.1, 0.2, 0.3];
    const mockDb = (rows, matches) => {
        const calls = { exact: 0, match: 0 };
        return {
            calls,
            getCacheExact: async (normalized, pv) => {
                calls.exact++;
                return rows.find(r => r.query_normalized === normalized && r.prompt_version === pv) || null;
            },
            matchVizCache: async () => { calls.match++; return matches; },
        };
    };
    const neverEmbed = async () => { throw new Error('embed must not be called on exact hit'); };
    const mockEmbed = async () => FAKE_EMBEDDING;
    const row = { slug: 'abc12345', query_normalized: 'bubble sort', prompt_version: 'v1', html: '<html></html>', hit_count: 0 };

    const exactHit = await lookupCache({
        query: '  Bubble  Sort ', promptVersion: 'v1', embed: neverEmbed,
        db: mockDb([row], []),
    });
    check('exact hit served without embedding call',
        exactHit.hit === row && exactHit.matchType === 'exact');

    const wrongVersion = await lookupCache({
        query: 'bubble sort', promptVersion: 'v2', embed: mockEmbed,
        db: mockDb([row], []),
    });
    check('exact match on other prompt_version is not served', wrongVersion.hit === null);

    const semanticHit = await lookupCache({
        query: 'bubblesort visualization', promptVersion: 'v1', embed: mockEmbed,
        db: mockDb([], [{ ...row, similarity: 0.95 }]),
    });
    check('semantic match at 0.95 is served with embedding returned',
        semanticHit.hit !== null && semanticHit.matchType === 'semantic' && semanticHit.embedding === FAKE_EMBEDDING);

    let nearMissLogged = false;
    const origLog = console.log;
    console.log = (...args) => {
        if (String(args[0]).includes('near-miss')) nearMissLogged = true;
        origLog(...args);
    };
    const nearMiss = await lookupCache({
        query: 'why is bubble sort slow', promptVersion: 'v1', embed: mockEmbed,
        db: mockDb([], [{ ...row, similarity: 0.85 }]),
    });
    console.log = origLog;
    check('near-miss at 0.85 is NOT served', nearMiss.hit === null);
    check('near-miss at 0.85 is logged', nearMissLogged);
    check('miss still returns embedding for the later insert', nearMiss.embedding === FAKE_EMBEDDING);

    const fullMiss = await lookupCache({
        query: 'dijkstra', promptVersion: 'v1', embed: mockEmbed,
        db: mockDb([], [{ ...row, similarity: 0.42 }]),
    });
    check('similarity below 0.80 is a plain miss', fullMiss.hit === null);

    const embedFails = await lookupCache({
        query: 'quicksort', promptVersion: 'v1', embed: async () => { throw new Error('quota'); },
        db: mockDb([], []),
    });
    check('embed failure degrades to a miss without throwing',
        embedFails.hit === null && embedFails.embedding === null);

    // --- Bridge telemetry detection (soft check, never pass/fail) ---
    console.log('Bridge detection:');
    check('message listener in a script detects as bridge',
        hasCommandBridge('<html><body><script>window.addEventListener("message", (e) => {});</script></body></html>'));
    check('no message listener detects as absent',
        !hasCommandBridge('<html><body><script>const x = 1;</script></body></html>'));
    check('mention of onmessage outside scripts does not count',
        !hasCommandBridge('<html><body><div>uses onmessage</div><script>const x = 1;</script></body></html>'));

    // --- Quiz fresh-first with stored fallback (mocked db + generate) ---
    console.log('Quiz fallback:');
    const FRESH_QUIZ = { questions: ['fresh'] };
    const STORED_QUIZ = { questions: ['stored'] };
    const quizDb = (row) => {
        const stored = [];
        return {
            stored,
            getQuizCacheRow: async () => row,
            storeQuizOnCacheRow: async (id, quiz) => { stored.push({ id, quiz }); },
        };
    };

    {
        const db = quizDb({ id: 'row1', quiz: STORED_QUIZ });
        const result = await quizWithFallback({
            topic: '  Bubble SORT ', generate: async () => FRESH_QUIZ, db,
        });
        await new Promise(r => setTimeout(r, 10)); // let fire-and-forget store land
        check('fresh success serves fresh and stores it on the cache row',
            result.fallback === false && result.quiz === FRESH_QUIZ &&
            db.stored.length === 1 && db.stored[0].id === 'row1' && db.stored[0].quiz === FRESH_QUIZ);
    }

    {
        const db = quizDb({ id: 'row1', quiz: STORED_QUIZ });
        const result = await quizWithFallback({
            topic: 'bubble sort', generate: async () => { throw new Error('quota'); }, db,
        });
        check('generation failure with stored quiz serves fallback: true',
            result.fallback === true && result.quiz === STORED_QUIZ && db.stored.length === 0);
    }

    {
        const db = quizDb({ id: 'row1', quiz: null }); // row exists, no stored quiz
        let threw = false;
        try {
            await quizWithFallback({ topic: 'bubble sort', generate: async () => { throw new Error('quota'); }, db });
        } catch (e) { threw = e.message === 'quota'; }
        check('generation failure without stored quiz rethrows', threw);
    }

    {
        const db = quizDb(null); // no cache row at all
        const ok = await quizWithFallback({ topic: 'new topic', generate: async () => FRESH_QUIZ, db });
        let threw = false;
        try {
            await quizWithFallback({ topic: 'new topic', generate: async () => { throw new Error('boom'); }, db });
        } catch { threw = true; }
        check('no cache row behaves as today (success passes through, failure rethrows)',
            ok.fallback === false && ok.quiz === FRESH_QUIZ && db.stored.length === 0 && threw);
    }

    {
        let dbTouched = false;
        const db = { getQuizCacheRow: async () => { dbTouched = true; return null; }, storeQuizOnCacheRow: async () => { dbTouched = true; } };
        const off = await quizWithFallback({ topic: 'x', enabled: false, generate: async () => FRESH_QUIZ, db });
        check('cache flag off skips db entirely', off.fallback === false && off.quiz === FRESH_QUIZ && !dbTouched);
    }

    // --- Rate limiter (injected clock, no waiting) ---
    console.log('Rate limiter:');
    const allow = createRateLimiter({ limit: 30, windowMs: 60_000 });
    const t0 = 1_000_000;
    let allowed = 0;
    for (let i = 0; i < 30; i++) if (allow('1.2.3.4', t0 + i)) allowed++;
    check('allows 30 requests within the window', allowed === 30);
    check('blocks the 31st request', allow('1.2.3.4', t0 + 31) === false);
    check('other IPs are unaffected', allow('5.6.7.8', t0 + 31) === true);
    check('allows again after the window expires', allow('1.2.3.4', t0 + 61_000) === true);

    // --- Library helpers (frontend TS, run via node type-stripping) ---
    console.log('Library helpers:');
    const lib = spawnSync(
        process.execPath,
        ['--experimental-strip-types', '--no-warnings', path.join(__dirname, 'library_tests.mjs')],
        { encoding: 'utf8' }
    );
    process.stdout.write((lib.stdout || '').replace(/^LIBRARY_RESULT.*\n?$/m, ''));
    const resultLine = (lib.stdout || '').match(/LIBRARY_RESULT (\d+) (\d+)/);
    if (resultLine) {
        passed += Number(resultLine[1]);
        failed += Number(resultLine[2]);
    } else {
        failed++;
        console.log(`  ✗ library test child failed to run — ${lib.stderr || 'no output'}`);
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Test run crashed:', e);
    closeBrowser().finally(() => process.exit(1));
});
