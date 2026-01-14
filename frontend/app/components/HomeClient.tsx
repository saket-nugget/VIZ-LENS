"use client";

import { useState } from "react";
import InputBox from "./InputBox";

export default function HomeClient() {
  const [input, setInput] = useState("");

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6 text-center">
      <h1 className="text-3xl font-semibold text-white">VIZ-LENS</h1>
      <p className="text-white/60">Turn problems into intuition.</p>

      <InputBox value={input} onChange={setInput} label="Visualize" />
    </div>
  );
}
