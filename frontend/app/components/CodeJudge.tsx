"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

interface JudgeProps {
    topic: string;
}

export default function CodeJudge({ topic }: JudgeProps) {
    const [code, setCode] = useState("// Write your implementation here...");
    const [language, setLanguage] = useState("javascript");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSkipped, setIsSkipped] = useState(false);

    if (isSkipped) {
        return (
            <div className="max-w-4xl w-full mx-auto mt-8 text-center bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-gray-400">Code Challenge Skipped.</p>
                <button
                    onClick={() => setIsSkipped(false)}
                    className="text-white hover:text-blue-400 hover:underline text-sm mt-2 transition-colors"
                >
                    Show Challenge Area
                </button>
            </div>
        )
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

    const handleSubmit = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/judge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, topic, language }),
            });
            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setResult(data.result);
            }
        } catch (error) {
            console.error("Judge failed", error);
            setError("Failed to connect to the Judge API.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-4xl w-full mx-auto mt-8 transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        💻 Code Challenge: <span className="text-blue-400">{topic}</span>
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">Implement the algorithm below. The AI Judge will check your logic.</p>
                </div>
                <button
                    onClick={() => setIsSkipped(true)}
                    className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                >
                    Skip Challenge
                </button>
            </div>

            <div className="flex justify-between items-center mb-3">
                <div className="text-xs text-gray-500 font-mono">
                    Mode: Logic Verification
                </div>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#0D1117] text-gray-300 border border-white/20 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer hover:border-white/40 transition-colors"
                >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>
            </div>

            <div className="h-[400px] border border-white/20 rounded-lg overflow-hidden bg-[#1e1e1e]">
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                    }}
                />
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 active:scale-95"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Judging Logic...
                        </span>
                    ) : "Submit Code for Logic Review"}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 animate-in fade-in slide-in-from-top-2">
                    <strong className="block font-bold mb-1">Error Submitting Code:</strong>
                    {error}
                </div>
            )}

            {result && (
                <div className={`mt-6 p-5 rounded-lg border backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300 ${result.error_line === 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-full ${result.error_line === 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {result.error_line === 0 ? "✅" : "❌"}
                        </div>
                        <h4 className={`text-lg font-bold ${result.error_line === 0 ? "text-green-400" : "text-red-400"}`}>
                            {result.error_line === 0 ? "Logic Passed!" : `Logic Error Detected`}
                        </h4>
                    </div>

                    {result.error_line > 0 && (
                        <div className="mb-3 text-red-300 font-mono text-sm bg-red-950/30 px-3 py-1 rounded inline-block border border-red-500/20">
                            Problem at Line: {result.error_line}
                        </div>
                    )}

                    {result.reason && (
                        <p className="text-gray-200 mb-4 leading-relaxed">{result.reason}</p>
                    )}

                    {result.visual_reference && (
                        <div className="mt-3 text-sm text-blue-200 bg-blue-900/20 p-4 rounded-lg font-mono border border-blue-500/30 flex gap-3 items-start">
                            <span className="text-xl">👁️</span>
                            <div>
                                <strong className="block text-blue-400 mb-1 text-xs uppercase tracking-wider">Visual Intuition</strong>
                                {result.visual_reference}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
