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
          style={{ minWidth: 180, fontSize: '1.15rem', background: '#3498db', color: '#fff', border: '2px solid #3498db', borderRadius: 999 }}
          className="flex-1 px-4 py-3 font-semibold"
        >
          📤 Submit Again
        </button>
        <button
          type="button"
          onClick={onHome}
          style={{ minWidth: 120, fontSize: '1.15rem', background: '#2980b9', color: '#fff', border: '2px solid #2980b9', borderRadius: 999 }}
          className="flex-1 px-4 py-3 font-semibold"
        >
          🏠 Home
        </button>
      </div>
    </div>
  );
};
