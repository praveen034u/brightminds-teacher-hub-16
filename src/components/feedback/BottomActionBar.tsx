import React from "react";

type BottomActionBarProps = {
  onResubmit: () => void;
  onHome: () => void;
};

export const BottomActionBar = ({ onResubmit, onHome }: BottomActionBarProps) => {
  return (
    <div className="sticky bottom-0 mt-8 rounded-3xl bg-white/90 p-4 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onResubmit}
          className="flex-1 rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-white"
        >
          📤 Submit Again
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          🏠 Home
        </button>
      </div>
    </div>
  );
};
