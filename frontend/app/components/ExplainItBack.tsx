"use client";

import { useState } from "react";
import { logEvent } from "../lib/logEvent";

interface ExplainResult {
    understood: boolean;
    missing_concepts: string[];
    feedback: string;
}

interface ExplainItBackProps {
    topic: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const MAX_CHARS = 1000;

// Diagnostic only, never gating — no score, always skippable. Free-text
// grading is where LLM feedback gets weakest, so this frames everything as
// what a fuller explanation would additionally cover, never as an error.
export default function ExplainItBack({ topic }: ExplainItBackProps) {
    const [expanded, setExpanded] = useState(false);
    const [explanation, setExplanation] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ExplainResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!explanation.trim() || loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/explain`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    prompt_question: `Explain how ${topic} works, in your own words.`,
                    user_explanation: explanation,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to get feedback");
            setResult(data);
            logEvent("explain_submitted", { understood: data.understood });
        } catch {
            // Diagnostic feature — a failure here should never block the user.
            setError("Couldn't get feedback right now, but that's fine — you can still move on.");
        } finally {
            setLoading(false);
        }
    };

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mb-4 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
            >
                Explain it in your own words (optional)
            </button>
        );
    }

    return (
        <div className="mb-4 p-5 rounded-xl border border-white/10 bg-white/5 text-left">
            <h4 className="text-sm font-bold text-gray-300 mb-1">Explain it in your own words</h4>
            <p className="text-xs text-gray-500 mb-3">No grade here — just a check on your own understanding.</p>

            <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value.slice(0, MAX_CHARS))}
                placeholder={`How would you explain ${topic} to a friend?`}
                rows={4}
                disabled={loading || !!result}
                className="w-full bg-[#0f1218] border border-white/20 rounded-xl p-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-blue-500 outline-none transition-all resize-none disabled:opacity-60"
            />

            <div className="flex justify-between items-center mt-2">
                <span className="text-[11px] text-gray-600">{explanation.length}/{MAX_CHARS}</span>
                {!result && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !explanation.trim()}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                    >
                        {loading ? "Checking..." : "Get feedback"}
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

            {result && (
                <div
                    className={`mt-3 p-3 rounded-lg border ${result.understood
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-amber-500/30 bg-amber-500/10"
                        }`}
                >
                    <p className={`text-sm ${result.understood ? "text-green-300" : "text-amber-300"}`}>
                        {result.feedback}
                    </p>
                    {result.missing_concepts.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-1">A fuller explanation would also cover:</p>
                            <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5">
                                {result.missing_concepts.map((concept, i) => (
                                    <li key={i}>{concept}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
