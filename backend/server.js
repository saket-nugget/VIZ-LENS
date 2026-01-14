require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

        const response = await client.models.generateContent({
            model: 'models/gemini-2.5-flash',
            contents: systemPrompt
        });

        // Debugging: Log the response structure to understand why .text() fails
        const fs = require('fs');
        fs.appendFileSync('error.log', `\n[DEBUG Response]: ${JSON.stringify(response, null, 2)}\n`);

        // Try to handle different response structures
        let html = "";
        if (typeof response.text === 'function') {
            html = response.text();
        } else if (response.candidates && response.candidates.length > 0) {
            // Raw API structure
            html = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            // Maybe it's a property?
            html = response.text;
        } else {
            throw new Error("Unknown response structure");
        }

        res.json({ html });

    } catch (error) {
        const fs = require('fs');
        const errorLog = `\n[${new Date().toISOString()}] Error: ${error.message}\nDetails: ${JSON.stringify(error, null, 2)}\n`;
        fs.appendFileSync('error.log', errorLog);

        console.error("Gemini API Error Details:", JSON.stringify(error, null, 2));
        res.status(500).json({ error: "Failed to generate visualization", details: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
