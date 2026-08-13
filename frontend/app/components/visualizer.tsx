"use client";

import { type Ref } from "react";

type VisualizerProps = {
  html: string;
  // Exposed so pages can verify postMessage events came from this iframe
  ref?: Ref<HTMLIFrameElement>;
};

export default function Visualizer({ html, ref }: VisualizerProps) {
  return (
    <iframe
      ref={ref}
      // No allow-same-origin: paired with allow-scripts it would give the
      // generated code a same-origin document and disable the sandbox entirely.
      sandbox="allow-scripts"
      srcDoc={html}
      className="w-full h-screen border-0"
      title="Visualization"
    />
  );
}
