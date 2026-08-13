"use client";

import { useEffect, type RefObject } from "react";

// Listens for the START_QUIZ message posted by the generated visualization
// and scrolls to the quiz section.
//
// Only messages from our own iframe are accepted (event.source check).
// Do NOT check event.origin instead: the sandbox omits allow-same-origin,
// so the iframe has an opaque origin and event.origin is the literal
// string "null" — an origin comparison would silently never match.
export function useStartQuizListener(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  quizRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data !== "START_QUIZ") return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const el = quizRef.current;
      if (!el) return;
      const beforeY = window.scrollY;
      el.scrollIntoView({ behavior: "smooth" });
      // Smooth scroll silently no-ops in some embedded Chromium contexts
      setTimeout(() => {
        if (window.scrollY === beforeY) el.scrollIntoView();
      }, 400);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeRef, quizRef]);
}
