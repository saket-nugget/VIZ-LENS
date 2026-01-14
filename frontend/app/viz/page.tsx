"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Visualizer from "../components/visualizer";

export default function VizPage() {
  const searchParams = useSearchParams();
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = searchParams.get("q");
    if (!query) {
      setError("No query provided");
      setLoading(false);
      return;
    }

    const fetchVisualization = async () => {
      try {
        const response = await fetch("/api/generate", {
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
      } catch (err: any) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVisualization();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D1117]">
        <div className="text-white text-xl">Generating visualization...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D1117]">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#0D1117]">
      <button
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 z-10 
                   px-6 py-3 rounded-xl 
                   bg-white/10 backdrop-blur-sm
                   border border-white/20
                   text-white font-semibold
                   hover:bg-white/20 hover:border-white/30
                   active:scale-95
                   transition-all duration-200
                   shadow-lg"
      >
        🏠︎
      </button>
      <Visualizer html={html} />
    </div>
  );
}
