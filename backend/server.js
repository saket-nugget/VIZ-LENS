require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require("@google/genai");
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const upload = multer({ dest: 'uploads/' });

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

// Data Dashboard: Upload & Analyze Route
app.post('/api/upload-dataset', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    const filePath = req.file.path;
    let rowCount = 0;

    try {
        // Parse CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowCount++;
                    if (results.length < 10000) {
                        results.push(data);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Cleanup file immediately
        fs.unlinkSync(filePath);

        if (results.length === 0) {
            return res.status(400).json({ error: "CSV appears to be empty" });
        }

        const schema = Object.keys(results[0]).join(", ");
        const datasetHead = JSON.stringify(results, null, 2);

        const prompt = `**Role:** You are the VIZ-LENS Data Oracle. Your goal is to transform raw data into a complete, interactive visual narrative for a non-technical user.

**[INPUT DATA]**
- Dataset Snippet: ${datasetHead}
- Column Names & Data Types: ${schema}
- Total Row Count: ${rowCount}

**[STRICT VISUALIZATION RULES]**
1. **Diversity Mandate:** You MUST select exactly THREE DIFFERENT chart types.
2. **The Palette:** You must pick one from each category:
   - Category A (Comparison): bar
   - Category B (Relationship/Trend): line, scatter, or area
   - Category C (Composition/Distribution): pie, donut, or treemap
3. **No Repeats:** Never use the same chart_type more than once in the entire dashboard.
4. **Logic Check:**
   - Use *Line* ONLY if there is a 'Date' or 'Time' column.
   - Use *Scatter* ONLY if comparing two numeric columns for correlation.
   - Use *Pie* ONLY for categories with fewer than 6 unique values.

**[TASK - GENERATE THE COMPLETE STORY]**
1. **Smart Snapshot:** Analyze the health and purpose of the data.
2. **Auto-Dashboard:** Select 3 IMPACTFUL and UNIQUE charts following the Palette rules above.
3. **Conversational Insights:** For each chart, explain What, Why, and Significance.
4. **Natural Language Knowledge Map:** Based on the columns, suggest the 3 most important questions a user *should* ask this data.
5. **Integrity Guardrail:** Identify any statistical bias, outliers, or misleading patterns.

**[OUTPUT FORMAT - STRICT JSON ONLY]**
{
  "snapshot": {
    "title": "catchy_title",
    "summary": "2_sentence_overview",
    "health_grade": "A|B|C|D",
    "quick_stats": ["stat1", "stat2"]
  },
  "dashboard": [
    {
      "chart_id": 1,
      "chart_type": "bar|line|scatter|pie|area|donut|treemap",
      "title": "string",
      "x_axis": "col_name (must exist in schema)",
      "y_axis": "col_name (must exist in schema)",
      "insights": { "what": "string", "why": "string", "significance": "string" }
    }
  ],
  "assistant_config": {
    "suggested_queries": [
      { "question": "Question text?", "logic_hint": "Filter by X, Group by Y" }
    ],
    "data_context_summary": "A brief summary for the AI to remember if asked a follow-up question."
  },
  "guardrail": {
    "message": "⚠️ Warning_text",
    "severity": "high|medium"
  }
}`;

        const response = await generateWithRetry('gemini-3-flash-preview', prompt, {
            responseMimeType: 'application/json'
        });

        let dashboardData = {};
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts.length > 0) {
            const text = response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
            dashboardData = JSON.parse(text);
        } else if (response.text) {
            // Fallback for different response shapes
            const text = typeof response.text === 'function' ? response.text() : response.text;
            dashboardData = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        }

        // Return the Analysis + The Raw Data (so frontend can graph it)
        // Caution: Sending 10k rows to frontend is fine (modern browsers handle it), but 1M might lag.
        // For MVP/Hackathon, sending full JSON is perfect.
        // We'll re-read the full file if we wanted to send all rows, but 'results' only has 5.
        // Wait, I only saved 5 rows.
        // I need to parse the WHOLE file to data array to send it to frontend for Chart.js
        // Let's re-parse or just store all in memory (Hackathon scale: <10MB is fine).

        // REVISION: Parse all rows into memory for the frontend.
        // (Since I already consumed the stream, I need to do this differently or just store all)

        res.json({ analysis: dashboardData, dataset: results });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Ensure cleanup

        if (error.status === 429 || (error.message && error.message.includes('quota'))) {
            return res.status(429).json({ error: "Gemini API Quota Exceeded", details: error.message });
        }
        res.status(500).json({ error: "Failed to analyze dataset", details: error.message });
    }
});

// Data Assistant Chat Route
app.post('/api/ask-dataset', async (req, res) => {
    try {
        const { query, schema, context } = req.body;

        const prompt = `**Role:** VIZ-LENS Chat Assistant.
**Context:** You are analyzing a dataset with these columns: ${schema}.
**Background Info:** ${context || "None"}
**User Question:** "${query}"

**Task:** Answer the question using the data logic and specify the best chart to show the answer.

**Return JSON:**
{
  "text_answer": "Direct answer to the question",
  "chart_to_render": { "type": "string", "x": "col", "y": "col" },
  "follow_up": "One more thing they could ask."
}`;

        const response = await generateWithRetry('gemini-3-flash-preview', prompt, {
            responseMimeType: 'application/json'
        });

        let answerData = {};
        if (response.candidates && response.candidates[0].content.parts.length > 0) {
            const text = response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
            answerData = JSON.parse(text);
        }

        res.json(answerData);

    } catch (error) {
        console.error("Chat API Error:", error);
        if (error.status === 429 || (error.message && error.message.includes('quota'))) {
            return res.status(429).json({ error: "Gemini API Quota Exceeded", details: error.message });
        }
        res.status(500).json({ error: "Failed to get answer", details: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
