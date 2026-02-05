"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Visualizer from "../components/visualizer";
import Quiz from "../components/Quiz";
import CodeJudge from "../components/CodeJudge";
import { ArrowLeft, Search, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function VizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q");

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showJudge, setShowJudge] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const lastQuery = useRef<string | null>(null);

  // Handle Search Submit from Empty State
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/viz?q=${encodeURIComponent(searchInput)}`);
    }
  };

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    // Prevent double-fetch in React Strict Mode
    if (query === lastQuery.current) return;
    lastQuery.current = query;
    setLoading(true); // Reset loading on new query
    setError(""); // Reset error

    const fetchVisualization = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate");
        }

        console.log("HTML received:", data.html);
        setHtml(data.html);
        setLoading(false);
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setLoading(false);
      }
    };

    fetchVisualization();
  }, [query]);

  // --- STATE 1: Empty Query -> Show Search Bar (The "Original Page") ---
  if (!query) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 md:p-14 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 mb-6">
            <BookOpen size={40} />
          </div>

          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
            Concept Lens
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Enter an algorithm, scientific concept, or any topic to visualize it instantly.
          </p>

          <form onSubmit={handleSearch} className="w-full relative group">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="What do you want to learn?"
              className="w-full bg-[#0f1218] border border-white/20 rounded-xl py-4 pl-5 pr-14 text-white placeholder:text-gray-600 focus:border-blue-500 outline-none transition-all shadow-inner"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg"
            >
              <Search size={20} />
            </button>
          </form>

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

  // --- STATE 2: Loading ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D1117] text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xl font-light tracking-wide animate-pulse">Generating visualization...</div>
      </div>
    );
  }

  // --- STATE 3: Error ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D1117] text-white p-4 text-center">
        <div className="text-red-500 text-2xl font-bold mb-4">Generation Failed</div>
        <p className="text-gray-400 mb-6 max-w-md">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // --- STATE 4: Success (Visualizer + Quiz + Judge) ---
  return (
    <div className="w-full min-h-screen bg-[#0D1117]">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 z-10 
                   px-4 py-2 rounded-xl flex items-center gap-2
                   bg-white/10 backdrop-blur-sm
                   border border-white/20
                   text-white font-medium text-sm
                   hover:bg-white/20 hover:border-white/30
                   transition-all duration-200
                   shadow-lg"
      >
        <ArrowLeft size={16} /> Home
      </button>

      <Visualizer html={html} />

      <div className="container mx-auto px-4 pb-20">
        {!showJudge ? (
          <Quiz
            topic={query}
            onComplete={() => setShowJudge(true)}
          />
        ) : (
          <CodeJudge topic={query} />
        )}
      </div>
    </div>
  );
}
