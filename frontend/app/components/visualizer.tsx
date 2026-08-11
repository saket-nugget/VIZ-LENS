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
      // No allow-same-origin: paired with allow-scripts it would give the
      // generated code a same-origin document and disable the sandbox entirely.
      sandbox="allow-scripts"
      srcDoc={html}
      className="w-full h-screen border-0"
      title="Visualization"
    />
  );
}
