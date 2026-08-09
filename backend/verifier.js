// Workstream A: verification & auto-repair for generated visualizations.
// Stage 1: static checks. Stage 2: Puppeteer smoke test. One repair attempt on failure.
const { parse } = require('node-html-parser');
const puppeteer = require('puppeteer');

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

    for (const script of scripts) {
        const code = script.rawText; // rawText preserves entities; .text decodes them
        const entity = ESCAPED_ENTITIES.find(e => code.includes(e));
        if (entity) {
            fail('escaped-entities', `Escaped HTML entity ${entity} inside <script> — breaks execution`);
            break;
        }
    }

    // These throw in the origin-less sandboxed iframe (sandbox="allow-scripts")
    const forbidden = FORBIDDEN_STORAGE.find(f => html.includes(f));
    if (forbidden) {
        fail('forbidden-storage', `Uses ${forbidden}, which throws in the origin-less iframe`);
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

module.exports = { stripCodeFences, runStaticChecks, initBrowser, closeBrowser, runSmokeTest };
