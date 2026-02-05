"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Database, ArrowRight, Search, Upload } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [isHoveredConcept, setIsHoveredConcept] = useState(false);
  const [isHoveredData, setIsHoveredData] = useState(false);

  const handleConceptSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      router.push(`/viz?q=${encodeURIComponent(topic)}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">

      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center mb-16 space-y-4"
      >
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          VIZ-LENS
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light tracking-wide">
          The Universal Visualizer. Choose your path to understanding.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full z-10 px-4">

        {/* LEFT: Concept Lens (Visualizer) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onHoverStart={() => setIsHoveredConcept(true)}
          onHoverEnd={() => setIsHoveredConcept(false)}
          className={`
            relative overflow-hidden group
            bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12
            hover:bg-white/10 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10
            transition-all duration-500 cursor-default flex flex-col items-center text-center
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className={`p-4 rounded-2xl bg-blue-500/10 text-blue-400 mb-6 transition-transform duration-500 ${isHoveredConcept ? 'scale-110 rotate-3' : ''}`}>
            <BookOpen size={48} />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Concept Lens</h2>
          <p className="text-gray-400 mb-8 h-12">Visualize algorithms, science concepts, and systems instantly.</p>

          <form onSubmit={handleConceptSearch} className="w-full relative group/input">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Bubble Sort, Photosynthesis..."
              className="w-full bg-[#0f1218] border border-white/20 rounded-xl py-4 pl-5 pr-12 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <Search size={18} />
            </button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {['BFS', 'Solar System', 'QuickSort'].map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`/viz?q=${encodeURIComponent(tag)}`)}
                className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-gray-400 hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* RIGHT: Data Lens (Dashboard) */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onHoverStart={() => setIsHoveredData(true)}
          onHoverEnd={() => setIsHoveredData(false)}
          onClick={() => router.push('/dashboard')}
          className={`
            relative overflow-hidden group cursor-pointer
            bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12
            hover:bg-white/10 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10
            transition-all duration-500 flex flex-col items-center text-center
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className={`p-4 rounded-2xl bg-purple-500/10 text-purple-400 mb-6 transition-transform duration-500 ${isHoveredData ? 'scale-110 -rotate-3' : ''}`}>
            <Database size={48} />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Data Lens</h2>
          <p className="text-gray-400 mb-8 h-12">Upload datasets for instant AI-powered dashboards & insights.</p>

          <div className="w-full bg-[#0f1218] border border-white/20 border-dashed rounded-xl py-6 flex flex-col items-center justify-center text-gray-500 group-hover:border-purple-500/50 group-hover:text-purple-400 transition-colors">
            <Upload size={32} className="mb-2 opacity-50 group-hover:opacity-100" />
            <span className="text-sm">Click to Open Data Lab</span>
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm text-purple-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
            Launch Dashboard <ArrowRight size={16} />
          </div>
        </motion.div>
      </div>
    </main>
  );
}
