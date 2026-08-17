"use client";

import { useState, useEffect, useRef } from "react";
import type { StepInfo } from "../lib/useVizBridge";

interface Question {
    question: string;
    options: string[];
    correctAnswer?: string;   // allow optional
    correctIndex?: number;    // allow optional
    explanation: string;
    optionFeedback?: Record<string, string>; // per-option "why right/wrong"
    step?: number | null;                    // anchors this question to a viz step
}

function shuffleArray<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Shuffles a question's options and resolves the correct answer to a plain
// string BEFORE shuffling — correctIndex would otherwise point at the wrong
// option post-shuffle. correctAnswer is matched by string value elsewhere,
// so reordering options never breaks scoring once this normalization runs.
function shuffleQuestion(q: Question): Question {
    const resolvedCorrect =
        typeof q.correctAnswer === "string"
            ? q.correctAnswer
            : typeof q.correctIndex === "number"
                ? q.options[q.correctIndex]
                : undefined;
    return {
        ...q,
        options: shuffleArray(q.options),
        correctAnswer: resolvedCorrect,
        correctIndex: undefined,
    };
}

// A fallback quiz served from the cache may have been generated for a
// DIFFERENT viz instance with different steps. Only trust a step anchor that
// is actually one of THIS session's real step numbers, or the "show me"
// button could jump to a step that doesn't exist.
//
// Deliberately membership-based, not a numeric range (e.g. 1..totalSteps):
// generated visualizations are not guaranteed to number their steps from 1
// — live testing showed a real generation numbering them from 0
// (`steps.map((s, idx) => ({ n: idx, ... }))`). A range check would have
// silently dropped every anchor to that visualization's first step.
function clampQuestionStep(q: Question, validStepNumbers: Set<number>): Question {
    const step = typeof q.step === "number" ? q.step : null;
    const valid = step !== null && validStepNumbers.has(step);
    return { ...q, step: valid ? step : null };
}

interface QuizProps {
    topic: string;
    onComplete: (score: number) => void;
    steps?: StepInfo[];             // this viz's real step manifest, if known
    onGotoStep?: (n: number) => void; // jumps the viz to a specific step
}

export default function Quiz({ topic, onComplete, steps, onGotoStep }: QuizProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [justJumpedStep, setJustJumpedStep] = useState<number | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

    const lastTopic = useRef<string | null>(null);

    useEffect(() => {
        // Prevent double-fetch in React Strict Mode — each quiz costs a Gemini call
        if (topic === lastTopic.current) return;
        lastTopic.current = topic;

        setLoading(true);
        setQuestions([]);
        setCurrentQuestion(0);
        setScore(0);
        setShowExplanation(false);
        setSelectedOption(null);
        setQuizCompleted(false);
        setJustJumpedStep(null);

        const fetchQuiz = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/quiz`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        steps && steps.length > 0 ? { topic, steps } : { topic }
                    ),
                });
                const data = await res.json();

                const questionsArr = data?.quiz?.questions;
                if (Array.isArray(questionsArr)) {
                    const validStepNumbers = new Set((steps ?? []).map((s) => s.n));
                    // Shuffle on every fetch so cached/fallback quizzes (which may
                    // have been served with the same option order many times) get
                    // a fresh order too, not just newly generated ones. Clamp step
                    // anchors against THIS viz's real step numbers — a fallback
                    // quiz can come from a different generation entirely.
                    setQuestions(
                        questionsArr
                            .map(shuffleQuestion)
                            .map((q) => clampQuestionStep(q, validStepNumbers))
                    );
                } else {
                    console.error("Invalid quiz format:", data);
                    setQuestions([]);
                }


            } catch (error) {
                console.error("Failed to load quiz", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [topic, steps]);

    const handleOptionClick = (option: string) => {
        if (selectedOption) return; // Prevent changing answer
        setSelectedOption(option);
        setShowExplanation(true);

        if (option === correct) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setShowExplanation(false);
            setJustJumpedStep(null);
        } else {
            setQuizCompleted(true);
            onComplete(score);
        }
    };

    if (loading) return <div className="text-white animate-pulse">Loading Quiz...</div>;
    if (questions.length === 0) return <div className="text-red-400">Failed to load quiz.</div>;

    const q = questions[currentQuestion];
    const correct =
        typeof q.correctAnswer === "string"
            ? q.correctAnswer
            : typeof q.correctIndex === "number"
                ? q.options[q.correctIndex]
                : undefined;
    if (!q) {
        return <div className="text-red-400">Quiz data is invalid.</div>;
    }

    if (quizCompleted) {
        return (
            <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                <h3 className="text-2xl font-bold text-white mb-4">Quiz Completed! 🎉</h3>
                <p className="text-gray-300 mb-4">
                    You scored {score} out of {questions.length}
                </p>
                <button
                    onClick={() => onComplete(score)}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                    Proceed to Code Challenge
                </button>
            </div>
        );
    }


    return (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-2xl w-full mx-auto mt-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Active Learning Quiz</h3>
                <span className="text-sm text-gray-400">Question {currentQuestion + 1}/{questions.length}</span>
            </div>

            <p className="text-lg text-gray-200 mb-6">{q.question}</p>

            {typeof q.step === "number" && onGotoStep && (
                <button
                    onClick={() => {
                        onGotoStep(q.step as number);
                        setJustJumpedStep(q.step as number);
                        setTimeout(() => setJustJumpedStep(null), 1500);
                    }}
                    className="mb-4 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-colors"
                >
                    {justJumpedStep === q.step ? `Showing step ${q.step}` : `📍 Step ${q.step} · show me`}
                </button>
            )}

            <div className="space-y-3">
                {q.options.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={!!selectedOption}
                        className={`w-full text-left p-4 rounded-lg border transition-all duration-200
              ${selectedOption === option
                                ? option === correct
                                    ? "bg-green-500/20 border-green-500 text-green-200"
                                    : "bg-red-500/20 border-red-500 text-red-200"
                                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                            }
              ${selectedOption && option === correct ? "bg-green-500/20 border-green-500 text-green-200" : ""}
            `}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {showExplanation && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-200 text-sm">
                        <span className="font-bold">Explanation:</span>{" "}
                        {(selectedOption && q.optionFeedback?.[selectedOption]) || q.explanation}
                    </p>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
