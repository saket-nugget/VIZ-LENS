"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Line, Bar, Scatter, Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Upload, MessageSquare, AlertTriangle, CheckCircle, BarChart2, ArrowLeft, Database } from 'lucide-react';
import { motion } from "framer-motion";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

// --- Types ---
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface DashboardData {
    snapshot: {
        title: string;
        summary: string;
        health_grade: string;
        quick_stats: string[];
    };
    dashboard: Array<{
        chart_id: number;
        chart_type: string;
        title: string;
        x_axis: string;
        y_axis: string;
        insights: { what: string; why: string; significance: string };
    }>;
    assistant_config: {
        suggested_queries: Array<{ question: string; logic_hint: string }>;
        data_context_summary: string;
    };
    guardrail: {
        message: string;
        severity: "high" | "medium";
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<DashboardData | null>(null);
    const [dataset, setDataset] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const res = await fetch(`${API_BASE_URL}/api/upload-dataset`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setAnalysis(data.analysis);
            setDataset(data.dataset);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to analyze dataset.");
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    // --- STATE 1: Upload (Glassmorphism Landing) ---
    if (!analysis) {
        return (
            <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="z-10 w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 md:p-14 shadow-2xl flex flex-col items-center text-center"
                >
                    <div className="p-4 rounded-full bg-purple-500/10 text-purple-400 mb-6">
                        <Database size={40} />
                    </div>

                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                        Data Lens
                    </h1>
                    <p className="text-gray-400 text-lg mb-8">
                        Upload your CSV. We'll verify the integrity, discover trends, and build a dashboard for you.
                    </p>

                    {error && (
                        <div className="mb-8 w-full p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="w-full relative group cursor-pointer">
                        <div className="border-2 border-dashed border-white/20 rounded-2xl p-10 hover:border-purple-500/50 transition-all bg-white/5 hover:bg-white/10 flex flex-col items-center gap-4">
                            {loading ? (
                                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-12 h-12 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                            )}
                            <div className="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">
                                {loading ? "Analyzing 10,000+ Rows..." : "Drag & Drop or Click to Upload"}
                            </div>
                            <p className="text-sm text-gray-500">Supports .csv files</p>
                        </div>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleUpload}
                            disabled={loading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => router.push('/')}
                        className="mt-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back to Hub
                    </button>
                </motion.div>
            </div>
        );
    }

    // --- STATE 2: Dashboard (Verified Premium UI) ---
    return (
        <div className="min-h-screen bg-[#0D1117] text-white p-6 md:p-8 font-sans selection:bg-purple-500/30">
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <button
                        onClick={() => setAnalysis(null)}
                        className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Upload New File
                    </button>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {analysis.snapshot.title}
                    </h1>
                    <p className="text-gray-400 mt-1 max-w-2xl">{analysis.snapshot.summary}</p>
                </div>

                <div className={`px-5 py-3 rounded-xl border flex items-center gap-3 backdrop-blur-md shadow-lg ${analysis.snapshot.health_grade === 'A' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    analysis.snapshot.health_grade === 'B' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}>
                    <CheckCircle className="w-6 h-6" />
                    <div>
                        <span className="block text-xs uppercase tracking-wider opacity-70 font-semibold">Data Health</span>
                        <span className="text-lg font-bold">Grade {analysis.snapshot.health_grade}</span>
                    </div>
                </div>
            </header>

            {analysis.guardrail && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`max-w-7xl mx-auto mb-8 p-4 rounded-xl border flex items-start gap-4 ${analysis.guardrail.severity === 'high' ? 'bg-red-500/10 border-red-500/40 text-red-200' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-200'
                        }`}
                >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block text-xs uppercase tracking-wide opacity-70 mb-1">
                            Integrity Guardrail Triggered
                        </strong>
                        <p className="text-sm md:text-base">{analysis.guardrail.message}</p>
                    </div>
                </motion.div>
            )}

            <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Visuals Column */}
                <div className="xl:col-span-2 space-y-8">
                    {analysis.dashboard.map((chart, idx) => (
                        <ChartCard
                            key={chart.chart_id}
                            config={chart}
                            dataset={dataset}
                            index={idx}
                        />
                    ))}
                </div>

                {/* Sidebar: Chat Assistant */}
                <div className="xl:col-span-1">
                    <div className="sticky top-8">
                        <Assistant
                            config={analysis.assistant_config}
                            schema={Object.keys(dataset[0]).join(', ')}
                            context={analysis.assistant_config.data_context_summary}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

// --- Sub-Components ---

function ChartCard({ config, dataset, index }: { config: DashboardData['dashboard'][0], dataset: any[], index: number }) {
    const labels = dataset.map(d => d[config.x_axis] || "?").slice(0, 40);
    const dataPoints = dataset.map(d => parseFloat(d[config.y_axis]) || 0).slice(0, 40);

    const chartData = {
        labels,
        datasets: [{
            label: config.y_axis,
            data: dataPoints,
            backgroundColor: 'rgba(192, 132, 252, 0.5)', // Purple accent
            borderColor: 'rgba(192, 132, 252, 1)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
        }]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { display: false } } // Hide X labels for cleaner UI
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 hover:bg-white/[0.07] transition-colors group shadow-xl"
        >
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                        {config.title}
                    </h3>
                    <div className="flex gap-2 text-xs text-gray-500 font-mono uppercase tracking-wider">
                        <span>X: {config.x_axis}</span>
                        <span className="text-gray-700">|</span>
                        <span>Y: {config.y_axis}</span>
                    </div>
                </div>
                <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400 opacity-80 group-hover:opacity-100 transition-opacity">
                    {config.chart_type === 'bar' && <BarChart2 size={20} />}
                    {config.chart_type === 'line' && <span className="font-bold text-lg">~</span>}
                    {config.chart_type === 'pie' && <span className="font-bold text-lg">O</span>}
                </div>
            </div>

            <div className="h-64 w-full mb-8 relative">
                {config.chart_type === 'bar' && <Bar data={chartData} options={options} />}
                {config.chart_type === 'line' && <Line data={chartData} options={options} />}
                {!['bar', 'line', 'pie'].includes(config.chart_type) && <Bar data={chartData} options={options} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-dashed border-white/10">
                <div className="space-y-1">
                    <strong className="text-purple-400 text-xs uppercase tracking-widest font-bold">What</strong>
                    <p className="text-gray-300 text-sm leading-relaxed">{config.insights.what}</p>
                </div>
                <div className="space-y-1">
                    <strong className="text-blue-400 text-xs uppercase tracking-widest font-bold">Why</strong>
                    <p className="text-gray-300 text-sm leading-relaxed">{config.insights.why}</p>
                </div>
                <div className="space-y-1">
                    <strong className="text-green-400 text-xs uppercase tracking-widest font-bold">Significance</strong>
                    <p className="text-gray-300 text-sm leading-relaxed">{config.insights.significance}</p>
                </div>
            </div>
        </motion.div>
    );
}

function Assistant({ config, schema, context }: { config: DashboardData['assistant_config'], schema: string, context: string }) {
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
        { role: 'bot', text: "I'm ready. Ask me anything about this data." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const ask = async (q: string) => {
        if (!q.trim()) return;

        const newMsgs = [...messages, { role: 'user' as const, text: q }];
        setMessages(newMsgs);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/ask-dataset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q, schema, context })
            });
            const data = await res.json();
            setMessages([...newMsgs, { role: 'bot', text: data.text_answer || "I couldn't calculate that." }]);

        } catch (e) {
            setMessages([...newMsgs, { role: 'bot', text: "Error connecting to Oracle." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#161b22] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px] md:h-auto">
            <div className="p-5 bg-white/5 border-b border-white/10 flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">Data Assistant</h3>
                    <p className="text-xs text-gray-500">Powered by Gemini 3 Flash Preview</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 px-4 py-3 rounded-2xl text-xs text-gray-400 animate-pulse border border-white/5">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-5 bg-white/5 border-t border-white/10 mt-auto">
                {messages.length === 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {config.suggested_queries.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => ask(q.question)}
                                className="text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 rounded-lg border border-purple-500/20 transition-all text-left"
                            >
                                {q.question}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full bg-[#0D1117] text-white border border-white/20 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all shadow-inner placeholder:text-gray-600"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-2 p-1.5 bg-white/5 hover:bg-purple-500 text-gray-400 hover:text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft size={16} className="rotate-180" />
                    </button>
                </form>
            </div>
        </div>
    );
}
