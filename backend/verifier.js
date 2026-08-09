// Workstream A: verification & auto-repair for generated visualizations.
// Stage 1: static checks. Stage 2: Puppeteer smoke test. One repair attempt on failure.
const { parse } = require('node-html-parser');

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

module.exports = { stripCodeFences, runStaticChecks };
