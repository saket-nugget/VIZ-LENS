"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { logEvent } from "./logEvent";

export type StepInfo = { n: number; label: string };

// A's verifier already proves every visualization loads without a page error
// and responds to one click before a user ever sees it — so total silence
// this long is never a crashed page. It means either a legacy (pre-v3)
// visualization that's still genuinely in progress, or step-completion logic
// that never reaches "final step." Tune based on quiz_unreachable_fallback
// telemetry once real sessions are observed.
export const RECOVERY_TIMEOUT_MS = 3 * 60 * 1000;

export interface VizBridge {
  quizUnlocked: boolean;
  bridgeAvailable: boolean;
  steps: StepInfo[];
  totalSteps: number;
  currentStep: number;
  showRecoveryAffordance: boolean;
  gotoStep: (n: number) => void;
  unlockQuiz: () => void;
}

// Two-way channel between the parent page and a generated visualization's
// sandboxed iframe: listens for the quiz-unlock signal (legacy string or v3
// object form) and the v3 step manifest, and can post VL_GOTO_STEP back in.
// Also owns the "quiz unreachable" recovery affordance — a last-resort
// escape, not a general skip (see the timer effect below for why).
//
// Only messages from our own iframe are accepted (event.source check). Do
// NOT check event.origin instead: the sandbox omits allow-same-origin, so
// the iframe has an opaque origin and event.origin is the literal string
// "null" — an origin comparison would silently never match.
export function useVizBridge(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  quizRef: RefObject<HTMLElement | null>
): VizBridge {
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showRecoveryAffordance, setShowRecoveryAffordance] = useState(false);

  // Refs so the mount-once timer effect below can read current values
  // without needing them as dependencies (which would re-arm the timer).
  const quizUnlockedRef = useRef(false);
  const bridgeAvailableRef = useRef(false);
  const loggedRecoveryRef = useRef(false);
  const loggedUnlockRef = useRef(false);

  useEffect(() => {
    quizUnlockedRef.current = quizUnlocked;
  }, [quizUnlocked]);
  useEffect(() => {
    bridgeAvailableRef.current = bridgeAvailable;
  }, [bridgeAvailable]);

  const scrollToQuiz = useCallback(() => {
    const el = quizRef.current;
    if (!el) return;
    const beforeY = window.scrollY;
    el.scrollIntoView({ behavior: "smooth" });
    // Smooth scroll silently no-ops in some embedded Chromium contexts
    setTimeout(() => {
      if (window.scrollY === beforeY) el.scrollIntoView();
    }, 400);
  }, [quizRef]);

  const unlockQuiz = useCallback(() => {
    setQuizUnlocked((already) => {
      if (!already) {
        if (!loggedUnlockRef.current) {
          loggedUnlockRef.current = true;
          logEvent("quiz_unlocked", {});
        }
        setTimeout(scrollToQuiz, 50);
      }
      return true;
    });
  }, [scrollToQuiz]);

  const gotoStep = useCallback(
    (n: number) => {
      iframeRef.current?.contentWindow?.postMessage({ type: "VL_GOTO_STEP", step: n }, "*");
    },
    [iframeRef]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      // Legacy form — MUST keep working for pre-v3 cached visualizations.
      if (event.data === "START_QUIZ") {
        unlockQuiz();
        return;
      }

      const data = event.data;
      if (!data || typeof data !== "object") return;

      switch (data.type) {
        case "VL_QUIZ_REQUEST":
          unlockQuiz();
          break;
        case "VL_READY":
          setBridgeAvailable(true);
          setSteps(Array.isArray(data.steps) ? data.steps : []);
          if (typeof data.totalSteps === "number") setTotalSteps(data.totalSteps);
          break;
        case "VL_STEP":
          if (typeof data.step === "number") setCurrentStep(data.step);
          if (typeof data.totalSteps === "number") setTotalSteps(data.totalSteps);
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeRef, unlockQuiz]);

  // Recovery affordance — a last-resort escape for a quiz that never
  // unlocks, NOT a general skip: Sam's decision was "gate everywhere,
  // strictly, no skip," so this must only appear once a stuck session is
  // genuinely likely, not as a shortcut around a working walkthrough.
  //
  // Deliberately mount-once (empty deps) rather than restarted by VL_READY
  // or VL_STEP activity: the trigger is purely "how long has this been
  // locked," so a visualization that reports steps but never reaches
  // "final step" is caught too, not just total silence. Current values are
  // read via refs at expiry to avoid a stale closure.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (quizUnlockedRef.current) return; // unlocked naturally in the meantime
      setShowRecoveryAffordance(true);
      if (!loggedRecoveryRef.current) {
        loggedRecoveryRef.current = true;
        logEvent("quiz_unreachable_fallback", { bridgeAvailable: bridgeAvailableRef.current });
      }
    }, RECOVERY_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    quizUnlocked,
    bridgeAvailable,
    steps,
    totalSteps,
    currentStep,
    showRecoveryAffordance,
    gotoStep,
    unlockQuiz,
  };
}
