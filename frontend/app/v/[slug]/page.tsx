"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Visualizer from "../../components/visualizer";
import { BookOpen } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SharedVizPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      <div className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/5 border-b border-white/10 text-sm text-gray-300">
        Made with VIZ-LENS
        <span className="text-gray-500">→</span>
        <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
          Create your own
        </a>
      </div>
      <Visualizer html={html} />
    </div>
  );
}
