"use client";

import { useState, useEffect } from "react";

interface Question {
  question: string;
  options: string[];
  correctAnswer?: string;   // allow optional
  correctIndex?: number;    // allow optional
  explanation: string;
}


interface QuizProps {
    topic: string;
    onComplete: () => void;
}

export default function Quiz({ topic, onComplete }: QuizProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [quizCompleted, setQuizCompleted] = useState(false);

    useEffect(() => {
        setLoading(true);
setQuestions([]);
setCurrentQuestion(0);
setScore(0);
setShowExplanation(false);
setSelectedOption(null);
setQuizCompleted(false);

        const fetchQuiz = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/quiz", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ topic }),
                });
                const data = await res.json();

const questionsArr = data?.quiz?.questions;
if (Array.isArray(questionsArr)) {
  setQuestions(questionsArr);
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
    }, [topic]);

    const handleOptionClick = (option: string) => {
        if (selectedOption) return; // Prevent changing answer
        setSelectedOption(option);
        setShowExplanation(true);

        if (option === correct){
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        } else {
            setQuizCompleted(true);
            onComplete();
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
                onClick={onComplete}
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
                        <span className="font-bold">Explanation:</span> {q.explanation}
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
