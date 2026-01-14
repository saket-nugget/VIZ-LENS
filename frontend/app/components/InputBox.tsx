"use client";

import React from "react";
import { useRouter } from "next/navigation";

const InputBox = (props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) => {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Query:", props.value);

    // Navigate to viz page with query parameter
    router.push(`/viz?q=${encodeURIComponent(props.value)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col items-center gap-6"
    >
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="Paste a LeetCode problem, code, or question..."
        className="w-full h-40 p-4 rounded-2xl bg-[#1C2128] 
                   border-2 border-white/10 text-white text-base
                   focus:outline-none focus:ring-2
                   focus:ring-[#6AE3FF]/50 
                   focus:border-[#6AE3FF]/50
                   placeholder:text-white/40
                   transition-all duration-300
                   resize-none
                   shadow-lg hover:border-white/20
                   overflow-y-auto"
        required
      />

      {props.label && (
        <button
          type="submit"
          className="px-10 py-3.5 rounded-xl bg-[#6AE3FF] text-black text-base font-semibold
                     hover:bg-[#39cbec] 
                     hover:shadow-xl 
                     active:scale-95
                     transition-all duration-200 cursor-pointer
                     shadow-lg"
        >
          {props.label}
        </button>
      )}
    </form>
  );
};

export default InputBox;

