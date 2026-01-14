"use client";

import { useState } from "react";

interface JudgeProps {
    topic: string;
}

export default function CodeJudge({ topic }: JudgeProps) {
    const [code, setCode] = useState("// Write your implementation here...");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("http://localhost:3000/api/judge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, topic, language: "javascript" }),
            });
            const data = await res.json();
            setResult(data.result);
        } catch (error) {
            console.error("Judge failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-4xl w-full mx-auto mt-8">
            <h3 className="text-xl font-bold text-white mb-4">Code Challenge: {topic}</h3>
            <p className="text-gray-400 mb-4">Implement the algorithm below. The AI Judge will evaluate your code.</p>

            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-64 bg-[#0D1117] text-gray-200 font-mono p-4 rounded-lg border border-white/20 focus:border-blue-500 outline-none resize-none"
                spellCheck={false}
            />

            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading ? "Judging..." : "Submit Code"}
                </button>
            </div>

            {result && (
                <div className={`mt-6 p-4 rounded-lg border ${result.passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <h4 className={`text-lg font-bold mb-2 ${result.passed ? "text-green-400" : "text-red-400"}`}>
                        {result.passed ? "✅ Passed!" : "❌ Failed"}
                    </h4>
                    <p className="text-gray-300 mb-2">{result.feedback}</p>
                    {result.optimizationTips && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-yellow-400 text-sm">💡 Tip: {result.optimizationTips}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
