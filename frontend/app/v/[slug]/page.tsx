"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Visualizer from "../../components/visualizer";
import Quiz from "../../components/Quiz";
import CodeJudge from "../../components/CodeJudge";
import { BookOpen, Share2 } from "lucide-react";
import { readLibrary, addToLibrary, updateQuizScore } from "../../lib/library";
import { useStartQuizListener } from "../../lib/useStartQuizListener";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SharedVizPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showJudge, setShowJudge] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const quizRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useStartQuizListener(iframeRef, quizRef);

  const showToast = (message: string, ms: number) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast("Link copied", 2000));
  };

  useEffect(() => {
    const fetchViz = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/viz/${params.slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setHtml(data.html);
        setQuery(data.query_raw || "");
        // Record in this device's library — but never clobber an existing
        // entry (it may hold a quiz score)
        if (data.query_raw && !readLibrary().some((e) => e.slug === params.slug)) {
          addToLibrary({
            slug: params.slug,
            query: data.query_raw,
            topic: data.query_raw,
            date: new Date().toISOString(),
            quizScore: null,
          });
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchViz();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D1117] text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xl font-light tracking-wide animate-pulse">Opening visualization...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D1117] text-white p-4 text-center">
        <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 mb-6">
          <BookOpen size={40} />
        </div>
        <div className="text-2xl font-bold mb-2">This link has nothing behind it</div>
        <p className="text-gray-400 mb-6 max-w-md">
          The visualization may have expired, or the link was mistyped.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          Make your own
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0D1117]">
      <div className="w-full flex items-center justify-between gap-2 py-2 px-4 bg-white/5 border-b border-white/10 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          Made with VIZ-LENS
          <span className="text-gray-500">→</span>
          <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Create your own
          </a>
        </div>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 rounded-lg flex items-center gap-2
                     bg-white/10 border border-white/20 text-white text-xs font-medium
                     hover:bg-white/20 hover:border-white/30 transition-all"
        >
          <Share2 size={14} /> Share
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl
                        bg-white/10 backdrop-blur-md border border-white/20
                        text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <Visualizer html={html} ref={iframeRef} />

      {query && (
        <div ref={quizRef} className="container mx-auto px-4 pb-20">
          {!showJudge ? (
            <Quiz
              topic={query}
              onComplete={(score) => {
                updateQuizScore(params.slug, score);
                setShowJudge(true);
              }}
            />
          ) : (
            <CodeJudge topic={query} />
          )}
        </div>
      )}
    </div>
  );
}
