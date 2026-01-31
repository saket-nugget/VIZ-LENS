require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini
// Initialize Gemini
// Initialize Gemini Keys
const apiKeys = [
    process.env.GEMINI_API_KEY
].filter(key => key && key.trim() !== '');

const uniqueKeys = [...new Set(apiKeys)];

if (uniqueKeys.length === 0) {
    console.error("CRITICAL ERROR: No Gemini API keys found in .env file!");
    // We don't exit here to allow the server to start, but requests will fail.
} else {
    console.log(`Loaded ${uniqueKeys.length} unique Gemini API keys.`);
}

let currentKeyIndex = 0;

function getClient() {
    if (uniqueKeys.length === 0) {
        throw new Error("No API keys available.");
    }
    const key = uniqueKeys[currentKeyIndex];
    console.log(`[DEBUG] Using Key: ${key.substring(0, 10)}...`);
    return new GoogleGenAI({ apiKey: key });
}

function rotateKey() {
    if (uniqueKeys.length <= 1) return; // No point rotating if only 1 key
    currentKeyIndex = (currentKeyIndex + 1) % uniqueKeys.length;
    console.log(`Rate Limit Hit. Rotating to API Key Index: ${currentKeyIndex}`);
}

async function generateWithRetry(modelName, prompt, config = {}) {
    let attempts = 0;
    const maxAttempts = Math.max(1, uniqueKeys.length);

    while (attempts < maxAttempts) {
        try {
            const client = getClient();
            const response = await client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: config
            });
            return response;
        } catch (error) {
            console.log(`[DEBUG] Attempt ${attempts + 1} failed. Error Status: ${error.status}, Message: ${error.message}`);

            // Check for 429 (Rate Limit) or 503 (Service Unavailable)
            // Also check if the message string contains "429" or "quota"
            const isRateLimit = error.status === 429 ||
                (error.message && (error.message.includes('429') || error.message.includes('quota'))) ||
                (error.toString && (error.toString().includes('429') || error.toString().includes('quota')));

            if (isRateLimit) {
                console.warn(`Quota exceeded for key index ${currentKeyIndex}. Rotating...`);
                rotateKey();
                attempts++;
            } else {
                console.error("Non-retriable error encountered:", error);
                throw error; // Re-throw other errors immediately
            }
        }
    }
    throw new Error(`All ${uniqueKeys.length} API keys have exhausted their quota.`);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
});

// Basic Route (Health Check)
app.get('/', (req, res) => {
    res.json({
        status: 'VIZ-LENS Backend is Running',
        timestamp: new Date().toISOString()
    });
});

// Gemini Generation Route
app.post('/api/generate', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        const systemPrompt = `**Role:** You are the VIZ-LENS Master Engine. You generate "AI-Native" Interactive Intuition Engines. You transform Code, Math, or Data into a premium, responsive HTML5 application.

**[TARGET INPUT]**
Topic / Problem to visualize: ${query}

**[CRITICAL: EXECUTION SAFETY]**
- Output ONLY the raw HTML code.
- NO MARKDOWN, NO EXPLANATIONS.
- NO HTML ENTITIES: Use literal quotes (") and symbols (<, >) in <script>. If you output &quot;, the app fails.
- NO EXTERNAL LIBS: Use Vanilla JS and HTML5 Canvas for all animations.

**[MANDATORY UI ARCHITECTURE]**
Every file MUST include these four sections exactly:
1. **Header & Stats:** Display live variables (e.g., "Current Min", "Max Profit").
2. **Dynamic Canvas:** A responsive area for the visualization.
3. **Interactive Control Bar:**
   - "Next" / "Prev" buttons to step through logic.
   - "Play / Pause" for auto-animation.
   - A "Progress Slider" synced to the steps.
4. **Intuition Box:** A #description-box that explains the "Why" of the current step in monospace font.

**[NEW FEATURE: INTERACTIVE INPUT LAB]**
- Include an <input type="text"> or <textarea> where the user can provide custom data.
- Include a "Generate Visualization" button that parses new input and re-generates the state.steps and Canvas layout instantly.

**[QUIZ HANDOFF]**
- Include a <button id="take-quiz-btn">Take the Quiz</button> that activates only at the final step.
- Action: window.parent.postMessage("START_QUIZ", "*");

**[VISUAL & LOGIC RULES]**
- Theme: Dark Slate (#0f172a) with Glassmorphism.
- Colors: Primary Blue (#00d1ff) for pointers, Success Green (#22c55e) for positive results, Danger Red (#ef4444) for conflicts.
- Canvas Logic: Use ctx.save() and ctx.restore(). Use bar charts, trees, or coordinate planes based on the topic.

**[OUTPUT REQUIREMENT]**
Return a complete, self-contained HTML document with inline CSS + inline JS.`;


        const response = await generateWithRetry('gemini-3-flash-preview', systemPrompt);

        let html = "";
        // Prioritize candidates array as seen in logs
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts.length > 0) {
            html = response.candidates[0].content.parts[0].text;
        } else if (typeof response.text === 'function') {
            html = response.text();
        } else if (response.text) {
            html = response.text;
        } else {
            throw new Error("Unknown response structure: " + JSON.stringify(response));
        }

        res.json({ html });

    } catch (error) {
        console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));

        if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exhausted')))) {
            return res.status(429).json({ error: "Gemini API Quota Exceeded: All keys exhausted.", details: error.message });
        }

        res.status(500).json({ error: "Failed to generate visualization", details: error.message });
    }
});

// Quiz Generation Route
app.post('/api/quiz', async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: "Topic is required" });
        }

        const quizPrompt = `Role: You are the VIZ-LENS Quizmaster.
Generate a premium, readable, conceptual quiz that matches the VIZ-LENS dark-glass UI.

TARGET TOPIC:
${topic}

RULES:
- Output STRICT JSON ONLY (no markdown, no backticks, no extra text).
- Generate EXACTLY 5 questions.
- Each question MUST have exactly 4 options.
- correctAnswer MUST be the EXACT option string (must match one of the options).
- Keep questions concise (<= 140 chars).
- Keep each option concise (<= 70 chars).
- Keep explanation helpful but short (<= 220 chars).
- Avoid overly academic wording; keep it crisp and intuitive.
- Make distractor options plausible (not silly).

QUESTION TYPES (in order):
1) Identify a key variable/state used by the algorithm.
2) Predict the next step / next state change.
3) What-if input changes (best/worst/duplicate/edge).
4) Time/space complexity reasoning.
5) Edge case handling (empty input, bounds, duplicates, already-sorted, etc.)

OUTPUT JSON SCHEMA:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;



        const response = await generateWithRetry('gemini-3-flash-preview', quizPrompt, {
            responseMimeType: 'application/json'
        });

        let quizData = [];
        try {
            let text = "";
            if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts.length > 0) {
                text = response.candidates[0].content.parts[0].text;
            } else if (typeof response.text === 'function') {
                text = response.text();
            } else if (response.text) {
                text = response.text;
            }

            // Clean markdown if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            quizData = JSON.parse(text);

        } catch (e) {
            console.error("Failed to parse quiz JSON:", e);
            return res.status(500).json({ error: "Failed to parse quiz data" });
        }

        res.json({ quiz: quizData });

    } catch (error) {
        console.error("Quiz API Error:", error);
        if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exhausted')))) {
            return res.status(429).json({ error: "Gemini API Quota Exceeded", details: error.message });
        }
        res.status(500).json({ error: "Failed to generate quiz", details: error.message });
    }
});

// Judge/Compiler Route
app.post('/api/judge', async (req, res) => {
    try {
        const { code, language, topic } = req.body;

        if (!code || !topic) {
            return res.status(400).json({ error: "Code and Topic are required" });
        }

        const judgePrompt = `**Role:** You are the VIZ-LENS Logic Judge. Your task is to provide pinpoint educational feedback on code logic.

**[TARGET PROBLEM]**
Algorithm / Concept: ${topic}

**[CONTEXT]**
- Programming Language: ${language}

**User Code (line numbers matter):**
${code}

**[TASK]**
Compare the User's Code against the correct logical steps of the algorithm.

1. Identify the FIRST line number where the logic deviates from the correct implementation.
2. If the code is 100% correct, set "error_line" to 0.
3. Explain *why* the logic is wrong using visualization-based intuition (e.g., pointer movement, bars, nodes, state transitions).

**[OUTPUT FORMAT — STRICT JSON ONLY]**
DO NOT include explanations, markdown, or commentary outside JSON.
{
  "error_line": number,
  "reason": "string",
  "visual_reference": "string"
}`;


        const response = await generateWithRetry('gemini-3-flash-preview', judgePrompt, {
            responseMimeType: 'application/json'
        });

        let judgeData = {};
        try {
            let text = "";
            if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts && response.candidates[0].content.parts.length > 0) {
                text = response.candidates[0].content.parts[0].text;
            } else if (typeof response.text === 'function') {
                text = response.text();
            } else if (response.text) {
                text = response.text;
            }

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            judgeData = JSON.parse(text);

        } catch (e) {
            console.error("Failed to parse judge JSON:", e);
            return res.status(500).json({ error: "Failed to parse judge data" });
        }

        res.json({ result: judgeData });

    } catch (error) {
        console.error("Judge API Error:", error);
        if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exhausted')))) {
            return res.status(429).json({ error: "Gemini API Quota Exceeded", details: error.message });
        }
        res.status(500).json({ error: "Failed to judge code", details: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
