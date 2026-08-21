"use client";

export interface RecapResult {
    misconception: string;
    evidence: string;
    one_liner: string;
    rewatch_step: number | null;
}

interface MisconceptionCardProps {
    loading: boolean;
    recap: RecapResult | null;
    bridgeAvailable: boolean;
    onRewatch: (step: number) => void;
}

// Shown above the score on the quiz-completed screen when the student missed
// at least one question. The score itself is never delayed by this — it
// renders immediately; this card fills in via its own loading state.
export default function MisconceptionCard({ loading, recap, bridgeAvailable, onRewatch }: MisconceptionCardProps) {
    if (loading) {
        return (
            <div className="mb-4 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-left animate-pulse">
                <div className="h-3 w-40 bg-white/10 rounded mb-3" />
                <div className="h-4 w-full bg-white/10 rounded mb-2" />
                <div className="h-3 w-2/3 bg-white/10 rounded" />
            </div>
        );
    }

    // Recap is a best-effort enhancement, not required for the results
    // screen — a failed fetch degrades silently rather than showing an error.
    if (!recap) return null;

    const canRewatch = recap.rewatch_step !== null && bridgeAvailable;

    return (
        <div className="mb-4 p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-left">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                What tripped you up
            </h4>
            {recap.one_liner && (
                <p className="text-gray-100 font-medium mb-2">{recap.one_liner}</p>
            )}
            <p className="text-gray-300 text-sm mb-1">{recap.misconception}</p>
            {recap.evidence && (
                <p className="text-gray-500 text-xs mb-3">{recap.evidence}</p>
            )}
            {canRewatch && (
                <button
                    onClick={() => onRewatch(recap.rewatch_step as number)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Rewatch step {recap.rewatch_step} ▸
                </button>
            )}
        </div>
    );
}
