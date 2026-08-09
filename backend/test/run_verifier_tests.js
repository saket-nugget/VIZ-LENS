// Verifier test script — run with: node test/run_verifier_tests.js (from backend/)
// No API key or network needed: the repair test uses a mocked generate function.
const fs = require('fs');
const path = require('path');
const { runStaticChecks, runSmokeTest, verify, closeBrowser, VerificationError } = require('../verifier');

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

    // --- Smoke test ---
    console.log('Smoke test:');
    const goodSmoke = await runSmokeTest(good);
    check('good.html passes smoke test', goodSmoke.pass, JSON.stringify(goodSmoke.failures));

    const badSmoke = await runSmokeTest(fixture('bad-runtime-error.html'));
    check('bad-runtime-error.html fails smoke test on Next click',
        !badSmoke.pass && badSmoke.failures.some(f => f.check === 'runtime-next'),
        JSON.stringify(badSmoke.failures));

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

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Test run crashed:', e);
    closeBrowser().finally(() => process.exit(1));
});
