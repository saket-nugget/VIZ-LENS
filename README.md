# VIZ-LENS - Interactive Intuition Engine 🧠✨

VIZ-LENS is a dual-engine educational tool designed to transform abstract concepts and raw data into interactive, visual experiences. Whether you want to visualize a sorting algorithm or analyze a complex CSV dataset, VIZ-LENS generates a custom, interactive dashboard instantly using Google Gemini.

🔗 **Live Demo:** [https://viz-lens.vercel.app](https://viz-lens.vercel.app)

<img width="1909" height="817" alt="image" src="https://github.com/user-attachments/assets/9055686a-055a-4bfd-bca6-f771d5a0e4c2" />
![WhatsApp Image 2026-02-09 at 11 25 10 PM](https://github.com/user-attachments/assets/b79b0440-e6cb-408d-b38f-a194a0a2a0d6)
![WhatsApp Image 2026-02-09 at 11 25 10 PM (1)](https://github.com/user-attachments/assets/941de8ee-a424-46c9-8757-bca92da6a15c)




## ✨ Features

### 1. Concept Lens (The Visualizer) 🎨
*   **🔮 Generative Simulations:** Turns text prompts (e.g., "Bubble Sort", "Photosynthesis") into interactive HTML5 visualizations.
*   **🕹️ Interactive Controls:** Step-by-step playback, speed control, and dynamic variable tracking.
*   **🧠 Active Learning:** Includes an auto-generated **Quiz** to test your understanding after the simulation.
*   **💻 Code Judge:** A built-in code editor that verifies your logical implementation of the concept using AI.

### 2. Data Lens (The Oracle) 📊
*   **📂 Intelligent Parsing:** Upload any CSV and instantly get a "Health Grade" and summary.
*   **📈 Auto-Dashboard:** Automatically selects the best 3 chart types (Bar, Line, Scatter, Pie) to visualize your data.
*   **🤖 Data Assistant:** A chat interface where you can ask questions like "Show me the trend of revenue over time" and get answers + charts.
*   **🛡️ Integrity Guardrails:** Automatically detects outliers, bias, and missing data.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 14 (App Router) + Tailwind CSS
*   **Backend:** Node.js + Express
*   **AI:** Google Gemini 1.5 Pro & Flash (via Google AI Studio)
*   **Visualization:** Chart.js + HTML5 Canvas
*   **Editor:** Monaco Editor (VS Code embedded)
*   **Animations:** Framer Motion
*   **Deployment:** Vercel (Frontend) + Render (Backend)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/saket-nugget/VIZ-LENS.git
    cd VIZ-LENS
    ```

2.  **Setup Backend**
    ```bash
    cd backend
    npm install
    # Create .env file
    echo "GEMINI_API_KEY=your_key_here" > .env
    node server.js
    ```

3.  **Setup Frontend**
    ```bash
    cd frontend
    npm install
    # Set Metadata
    # (Optional) Update NEXT_PUBLIC_BACKEND_URL in .env.local if deploying
    npm run dev
    ```

4.  **Run the App**
    Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📖 Usage Guide

1.  **Pick a Lens:** Choose **Concept Lens** for topics or **Data Lens** for files.
2.  **Concept Mode:** Type "A* Search Algorithm" and hit enter. Watch the simulation.
3.  **Data Mode:** Upload a CSV. Chat with the "Data Assistant" to uncover insights.
4.  **Test Yourself:** Complete the quiz and try to code the solution in the "Code Challenge" tab.

---

## 🔮 Future Scope
*   **🎙️ Voice Mode:** Explain concepts via voice interaction.
*   **📦 3D Models:** Integrate Three.js for scientific visualizations.
*   **📚 Classroom Mode:** Allow teachers to broadcast simulations to student screens.

---

## 🤝 Contributing
Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
