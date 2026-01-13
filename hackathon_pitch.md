# Project Name: VIZ-LENS
*The "Google Lens" for Abstract Concepts*

## 1. The Problem: "Information vs. Intuition"
We have infinite information (ChatGPT, StackOverflow), but zero **intuition**.
*   **Devs** copy code without seeing the execution flow.
# Project Name: VIZ-LENS
*The "Google Lens" for Abstract Concepts*

## 1. The Problem: "Information vs. Intuition"
We have infinite information (ChatGPT, StackOverflow), but zero **intuition**.
*   **Devs** copy code without seeing the execution flow.
*   **Students** memorize formulas without visualizing the physics.
*   **Analysts** stare at CSVs without seeing the patterns.

Existing tools are either **too specific** (sorting visualizers) or **too passive** (chatbots giving text answers). We lack a unified "Lens" to instantly visualize any complex input.

## 2. The Solution: VIZ-LENS
**VIZ-LENS** is an AI-Native Visualization Engine. It doesn't just "tell" you the answer; it **shows** you how it works through interactive, step-by-step visualizations.

It uses **Gemini 3 API** to auto-generate a self-contained **Interactive HTML5 Visualization** for any input (Code, Math, Data).

### Key Features
1.  **Generative UI (Gemini 3)**:
    *   We don't use static charts. We prompt Gemini 3 to write a custom **HTML5/JS file** representing the problem.
    *   **Step-by-Step Navigation**: The generated UI includes "Next" and "Previous" buttons, allowing users to walk through algorithms (like DFS) or math derivations line-by-line.
2.  **Active Learning Loop (The "Twist")**:
    *   **Quiz Phase**: After the visual walkthrough, the user *must* pass a conceptual quiz to proceed.
    *   **Implementation Sandbox**: The user is given a mini-compiler to write the code themselves.
    *   **AI Feedback**: If their code fails, Gemini analyzes the error and highlights *exactly* where their logic diverged from the visualization.
3.  **Universal "Lens"**:
    *   **Code**: Visualizes execution flow (Recursion trees, Pointers).
    *   **Math**: Visualizes equation transformations.
    *   **Data**: Visualizes patterns in CSVs.

## 3. The Pitch (Elevator Version)
"We are building **VIZ-LENS**. Think of it as **Google Lens**, but for abstract concepts.

Instead of asking a chatbot 'What is the answer?', you point VIZ-LENS at a problem and say 'Show me how this works.'
*   It uses **Gemini 3** to generate a custom **Interactive HTML5 App** for that specific problem.
*   You click 'Next' to watch the algorithm run step-by-step.
*   Then, you prove you learned it by writing the code in our **Sandbox**.

We solve the 'AI makes us lazy' problem by forcing **Active Learning**—users engage with the visual, take a quiz, and write code to unlock the solution. It's not a cheating tool; it's an intuition engine."

## 4. Why This Wins (Judge's Perspective)
1.  **Gemini 3 Native**: We leverage Gemini 3's advanced coding capabilities to generate *working UI code* on the fly (Generative UI).
2.  **Educational Impact**: The **Visual -> Quiz -> Code** loop ensures deep understanding, addressing the "AI makes students lazy" critique.
3.  **Technical Complexity**: We are building a system that writes its own frontend components based on user input.

## 5. Q&A
*   **Platform?** Web App. Accessible to everyone instantly.
*   **How do you visualize anything?** We treat UI as Code. Gemini 3 writes the HTML/Canvas code to draw the specific concept (e.g., a tree for DFS, a grid for DP).
*   **What if the user fails?** Our AI Feedback engine compares their code to the correct logic and explains the gap using the visualization.
