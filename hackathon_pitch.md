Gemini Hackathon - VIZ-LENS

Project Name: VIZ-LENS
The "Google Lens" for Abstract Concepts

1. The Problem: "Information vs. Intuition"
We have infinite information (ChatGPT, StackOverflow), but zero intuition.
- Devs copy code without seeing the execution flow.
- Students memorize formulas without visualizing the physics.
- Analysts stare at CSVs without seeing the patterns.

Existing tools are either too specific (sorting visualizers) or too passive (chatbots giving text answers). We lack a unified "Lens" to instantly visualize any complex input, tailored to cater to your doubts.

2. The Solution: VIZ-LENS
VIZ-LENS is an AI-Native Visualization Engine. It doesn't just "tell" you the answer; it SHOWS you how it works.

It uses **Gemini 3 Flash** to parse Code, Math, Data, or Repos and auto-generates interactive visuals (Flowcharts, Graphs, Data Plots).

Key Features
1. Universal Visualization:
   - Code: Highlights DFS code -> Sees a dynamic graph traversal.
   - Math: Highlights F=ma -> Sees a force interaction graph.
2. Instant Data Dashboards:
   - Right-click a CSV/JSON link -> Instant Heatmaps & Distribution plots (No Python needed).
3. Repo-to-Knowledge:
   - Paste a GitHub URL -> Generates a System Architecture Diagram of the entire codebase.
4. Active Learning (The "Twist"):
   - Gamification: The tool visualizes the process but hides the solution.
   - Unlock Mechanism: Users step through the visualization, take a generated **Quiz**, and then write code in the **AI Judge** to unlock the final solution.

3. In short (Elevator pitch)
"We are building VIZ-LENS. Think of it as Google Lens, but for abstract concepts.

Instead of asking a chatbot 'What is the answer?', you point VIZ-LENS at a problem and say 'Show me how this works.'
- It turns Code into Flowcharts.
- It turns Data into Dashboards.
- It turns Repos into Architecture Diagrams.

We solve the 'AI makes us lazy' problem by instead leveraging AI to forcing Active Learning—users engage with the visual to unlock the final code. It's not a cheating tool; it's an intuition engine."

4. Why This Wins (Judge's Perspective)
1. Multimodal "Wow" Factor: We go beyond text-to-text. We do Text-to-Visual and Data-to-Visual using Gemini's multimodal capabilities.
2. Solves Hallucination/Laziness: The "Active Learning" reward system proves we are enhancing human intelligence, not replacing it.
3. **Technical Depth**: It's a full-stack challenge—Complex Prompt Engineering + Dynamic Frontend Rendering + Real-time Code Evaluation using Gemini 3.
