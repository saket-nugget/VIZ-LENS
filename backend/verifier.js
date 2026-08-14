// Workstream A: verification & auto-repair for generated visualizations.
// Stage 1: static checks. Stage 2: Puppeteer smoke test. One repair attempt on failure.
const { parse } = require('node-html-parser');
const puppeteer = require('puppeteer');
const { logGenerationFailure, logEvent } = require('./db');

// Gemini sometimes wraps output in markdown fences despite instructions.
function stripCodeFences(html) {
    return html
        .replace(/^\s*```(?:html)?\s*\n?/i, '')
        .replace(/\n?```\s*$/, '')
        .trim();
}

const FORBIDDEN_STORAGE = ['localStorage', 'sessionStorage', 'document.cookie'];
const ESCAPED_ENTITIES = ['&quot;', '&lt;', '&gt;', '&amp;'];

// Returns { pass: boolean, failures: [{ check, error }] }
function runStaticChecks(html) {
    const failures = [];
    const fail = (check, error) => failures.push({ check, error });

    let root;
    try {
        root = parse(html);
    } catch (e) {
        fail('parse', `HTML failed to parse: ${e.message}`);
        return { pass: false, failures };
    }
    // node-html-parser is lenient; treat an empty parse of non-empty input as a parse failure
    if (!root || root.childNodes.length === 0) {
        fail('parse', 'HTML parsed to an empty document');
        return { pass: false, failures };
    }

    if (!root.querySelector('canvas')) {
        fail('canvas', 'No <canvas> element found');
    }
    if (!root.querySelector('#description-box')) {
        fail('description-box', 'Missing #description-box element');
    }
    if (!root.querySelector('#take-quiz-btn')) {
        fail('take-quiz-btn', 'Missing #take-quiz-btn element');
    }

    const scripts = root.querySelectorAll('script');
    if (scripts.length === 0) {
        fail('script', 'No <script> block found');
    }

    let entityFailed = false;
    let storageFailed = false;
    for (const script of scripts) {
        const code = script.rawText; // rawText preserves entities; .text decodes them
        const entity = !entityFailed && ESCAPED_ENTITIES.find(e => code.includes(e));
        if (entity) {
            fail('escaped-entities', `Escaped HTML entity ${entity} inside <script> — breaks execution`);
            entityFailed = true;
        }
        // These throw in the origin-less sandboxed iframe (sandbox="allow-scripts").
        // Script contents only — a viz that merely *mentions* localStorage in
        // display text or a comment runs fine and must not burn a repair attempt.
        const forbidden = !storageFailed && FORBIDDEN_STORAGE.find(f => code.includes(f));
        if (forbidden) {
            fail('forbidden-storage', `Uses ${forbidden} in <script>, which throws in the origin-less iframe`);
            storageFailed = true;
        }
        if (entityFailed && storageFailed) break;
    }

    return { pass: failures.length === 0, failures };
}

// --- Puppeteer smoke test ---
// Singleton browser (Render free tier ≈ 512MB — one Chromium max), launched at server boot.
let browser = null;

async function initBrowser() {
    if (browser) return browser;
    browser = await puppeteer.launch({
        headless: true, // v22+ new headless
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return browser;
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ERROR_CAPTURE_MS = 4000;
const POST_CLICK_WAIT_MS = 500;

// Returns { pass: boolean, failures: [{ check, error }] }
async function runSmokeTest(html) {
    await initBrowser();
    const context = await browser.createBrowserContext(); // incognito: fresh state per check
    const errors = [];
    try {
        const page = await context.newPage();
        page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
        });

        await page.setContent(html, { timeout: 8000 });
        await sleep(ERROR_CAPTURE_MS);

        if (errors.length > 0) {
            return { pass: false, failures: [{ check: 'runtime-load', error: errors.join('\n') }] };
        }

        // Find the "Next" step control: common ids first, then button text
        const clicked = await page.evaluate(() => {
            const byId = document.querySelector('#next-btn, #nextBtn, #next');
            const target = byId || [...document.querySelectorAll('button')]
                .find(b => /next/i.test(b.textContent));
            if (!target) return false;
            target.click();
            return true;
        });

        if (!clicked) {
            return { pass: false, failures: [{ check: 'runtime-next', error: 'No "Next" control found to click' }] };
        }

        await sleep(POST_CLICK_WAIT_MS);
        if (errors.length > 0) {
            return { pass: false, failures: [{ check: 'runtime-next', error: errors.join('\n') }] };
        }

        return { pass: true, failures: [] };
    } catch (e) {
        return { pass: false, failures: [{ check: 'runtime-load', error: `Smoke test crashed: ${e.message}` }] };
    } finally {
        await context.close().catch(() => {});
    }
}

// --- Stream C bridge telemetry (soft — NEVER a pass/fail check) ---
// Detects whether the generated code registers a window message listener,
// i.e. can accept commands like "jump to step N". Logged for compliance
// data only; a missing bridge must not fail verification or burn repairs.
// Stream C: extend these markers with the v3 bridge contract as it lands.
const BRIDGE_MARKERS = [
    'addEventListener("message"',
    "addEventListener('message'",
    'onmessage',
];

function hasCommandBridge(html) {
    let root;
    try {
        root = parse(html);
    } catch {
        return false;
    }
    return root.querySelectorAll('script')
        .some(s => BRIDGE_MARKERS.some(m => s.rawText.includes(m)));
}

// --- Verify + single repair attempt ---

class VerificationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'VerificationError';
    }
}

function describeFailures(failures) {
    return failures.map(f => `[${f.check}] ${f.error}`).join('\n');
}

// Runs static then runtime checks. Returns null on pass, else { stage, error }.
async function runChecks(html) {
    const staticResult = runStaticChecks(html);
    if (!staticResult.pass) {
        return { stage: 'static', error: describeFailures(staticResult.failures) };
    }
    const smokeResult = await runSmokeTest(html);
    if (!smokeResult.pass) {
        return { stage: 'runtime', error: describeFailures(smokeResult.failures) };
    }
    return null;
}

function buildRepairPrompt(html, failure) {
    return `You previously generated the HTML visualization below, but it failed verification.

**Failing check:** ${failure.stage}
**Exact error:**
${failure.error}

**Original HTML:**
${html}

Fix the problem and return the corrected COMPLETE HTML document only.
No markdown, no explanations, no code fences. Keep all required sections:
<canvas>, #description-box, #take-quiz-btn, Next/Prev controls.
Use literal quotes in <script> (never &quot;) and never use localStorage,
sessionStorage, or document.cookie.`;
}

// generate: async (prompt) => html text (injected — keeps model calls out of this module).
// Returns { html, verified: true, repaired } or throws VerificationError.
async function verify(rawHtml, { query, generate }) {
    const html = stripCodeFences(rawHtml);

    const failure = await runChecks(html);
    if (!failure) {
        logEvent('bridge_check', { query, present: hasCommandBridge(html), repaired: false });
        return { html, verified: true, repaired: false };
    }
    await logGenerationFailure({ query, stage: failure.stage, error: failure.error, repaired: false });

    // One repair attempt, then re-run both stages on the result.
    let repairedHtml;
    try {
        repairedHtml = stripCodeFences(await generate(buildRepairPrompt(html, failure)));
    } catch (e) {
        throw new VerificationError(`Repair generation failed: ${e.message}`);
    }

    const repairFailure = await runChecks(repairedHtml);
    if (!repairFailure) {
        logEvent('bridge_check', { query, present: hasCommandBridge(repairedHtml), repaired: true });
        return { html: repairedHtml, verified: true, repaired: true };
    }
    await logGenerationFailure({
        query,
        stage: `repair_${repairFailure.stage}`,
        error: repairFailure.error,
        repaired: true,
    });
    throw new VerificationError(`Verification failed after repair: ${repairFailure.error}`);
}

module.exports = {
    stripCodeFences,
    runStaticChecks,
    initBrowser,
    closeBrowser,
    runSmokeTest,
    verify,
    VerificationError,
    hasCommandBridge,
};
