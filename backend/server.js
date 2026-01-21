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
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
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

        const systemPrompt = `You are VIZ-LENS Master Engine. Generate interactive HTML5 visualizations that transform code/math/data problems into intuitive learning experiences.

CRITICAL EXECUTION RULES:
- Output ONLY raw HTML code (no markdown, no explanations)
- Use literal characters in <script> tags: ", <, > (NEVER &quot; &lt; &gt;)
- Use ONLY Vanilla JS and HTML5 Canvas (no external libraries)
- Make it fully self-contained and functional

MANDATORY UI COMPONENTS:
1. Header & Stats Panel: Display live variables and current state metrics
2. Dynamic Canvas: Responsive visualization area using HTML5 Canvas
3. Interactive Controls:
   - Step buttons (Next/Prev)
   - Play/Pause for auto-animation
   - Progress slider synced to steps
4. Intuition Box: Monospace text explaining the "why" of each step

INTERACTIVE INPUT LAB:
- Include input field/textarea for custom user data
- "Generate Visualization" button
- On click: parse input, regenerate state.steps array, redraw canvas instantly

DESIGN SYSTEM:
- Theme: Dark slate (#0f172a) with glassmorphism effects
- Colors: Blue (#00d1ff) for pointers, Green (#22c55e) for success, Red (#ef4444) for errors
- Canvas: Use ctx.save()/restore(), employ bar charts/trees/graphs as appropriate
- Focus on critical logical junctions to enhance active learning

Question: ${query}

Generate a complete HTML page with inline CSS and JavaScript. Make it visually appealing and educational.`;

        const response = await generateWithRetry('gemini-3-pro-preview', systemPrompt);

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

        const quizPrompt = `Generate 3 multiple-choice questions to test the user's understanding of: ${topic}.
        
        CRITICAL OUTPUT RULES:
        - Output ONLY valid JSON.
        - Do not include markdown formatting (like \`\`\`json).
        - Structure:
        [
            {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option A",
                "explanation": "Why this is correct."
            }
        ]
        `;

        const response = await generateWithRetry('gemini-3-pro-preview', quizPrompt, {
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

        const judgePrompt = `You are an AI Code Judge and Tutor. The user has written code for: ${topic}.
        
        User's Code (${language || 'javascript'}):
        ${code}

        CRITICAL OUTPUT RULES:
        - Analyze the code for correctness, efficiency, and style.
        - Output ONLY valid JSON.
        - Structure:
        {
            "passed": true/false,
            "feedback": "Short explanation of what is right or wrong.",
            "optimizationTips": "One tip to improve the code (optional)."
        }
        `;

        const response = await generateWithRetry('gemini-3-pro-preview', judgePrompt, {
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
