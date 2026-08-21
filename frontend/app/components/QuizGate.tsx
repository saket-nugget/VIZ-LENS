"use client";

interface QuizGateProps {
  unlocked: boolean;
  bridgeAvailable: boolean;
  currentStep: number;
  totalSteps: number;
  showRecovery: boolean;
  onRecoveryClick: () => void;
  children: React.ReactNode;
}

// Shared locked-state UI for both /viz and /v/[slug] — keeps the gate
// looking and behaving identically wherever the quiz can be reached from.
export default function QuizGate({
  unlocked,
  bridgeAvailable,
  currentStep,
  totalSteps,
  showRecovery,
  onRecoveryClick,
  children,
}: QuizGateProps) {
  if (unlocked) return <>{children}</>;

  return (
    <div className="bg-white/5 p-6 rounded-xl border border-white/10 max-w-2xl w-full mx-auto mt-8 text-center">
      <p className="text-gray-300">Complete the walkthrough to unlock the quiz.</p>
      {bridgeAvailable && totalSteps > 0 && (
        <p className="text-sm text-gray-500 mt-2">
          Step {currentStep || 1} / {totalSteps}
        </p>
      )}
      {showRecovery && (
        <button
          onClick={onRecoveryClick}
          className="mt-4 text-sm text-gray-500 hover:text-white underline underline-offset-2 transition-colors"
        >
          Trouble with this visualization? Open the quiz
        </button>
      )}
    </div>
  );
}
