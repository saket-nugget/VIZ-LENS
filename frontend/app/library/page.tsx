"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Zap } from "lucide-react";
import { readLibrary, type LibraryEntry } from "../lib/library";

function scoreBadge(quizScore: number | null) {
  if (quizScore === null) {
    return <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">No quiz yet</span>;
  }
  const style =
    quizScore >= 4
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : quizScore >= 2
        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
        : "bg-red-500/20 text-red-300 border-red-500/30";
  return <span className={`text-xs px-2 py-1 rounded-full border ${style}`}>Quiz {quizScore}/5</span>;
}

export default function LibraryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Read in an effect: localStorage doesn't exist during SSR/hydration
  useEffect(() => {
    setEntries(readLibrary().slice().reverse()); // newest first
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10 mt-4">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-xl flex items-center gap-2 bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={16} /> Home
          </button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            My Library
          </h1>
          <span className="text-xs text-gray-500" title="Your library lives in this browser's storage — no account, no sync.">
            Stored on this device
          </span>
        </div>

        {loaded && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24">
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 mb-6">
              <BookOpen size={40} />
            </div>
            <p className="text-xl text-gray-300 mb-2">Your visualizations will appear here — no account needed.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Visualize something
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <button
              key={entry.slug}
              onClick={() => router.push(`/v/${entry.slug}`)}
              className="text-left bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5
                         hover:bg-white/10 hover:border-blue-500/30 transition-all duration-200 shadow-lg"
            >
              <div className="font-semibold text-white mb-1 truncate capitalize">{entry.topic || entry.query}</div>
              <div className="text-xs text-gray-500 mb-4">
                {new Date(entry.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <div className="flex items-center gap-2">
                {scoreBadge(entry.quizScore)}
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Zap size={10} /> cached
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
