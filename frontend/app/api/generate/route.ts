import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("Enter_Your_API_Key_Here");

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are VIZ-LENS Master Engine. Generate interactive HTML5 visualizations that transform code/math/data problems into intuitive learning experiences.

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

    const result = await model.generateContent(prompt);
    const html = result.response.text();

    return NextResponse.json({ html });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
