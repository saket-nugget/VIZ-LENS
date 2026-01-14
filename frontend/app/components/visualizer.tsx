"use client";

import { useRef } from "react";

type VisualizerProps = {
  html: string;
};

export default function Visualizer({ html }: VisualizerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={html}
      className="w-full h-screen border-0"
      title="Visualization"
    />
  );
}
