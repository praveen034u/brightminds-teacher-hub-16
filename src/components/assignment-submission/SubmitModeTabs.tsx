import React from "react";

type SubmitModeTabsProps = {
  mode: "image" | "text";
  onChange: (mode: "image" | "text") => void;
};

export const SubmitModeTabs = ({ mode, onChange }: SubmitModeTabsProps) => {
  return (
    <div className="rounded-2xl bg-white/80 p-2 shadow-md">
      <div className="flex" role="tablist" aria-label="Submission mode">
        {(["image", "text"] as const).map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={mode === item}
            onClick={() => onChange(item)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === item
                ? "bg-teal-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            type="button"
          >
            {item === "image" ? "Upload Photo" : "Write in Editor"}
          </button>
        ))}
      </div>
    </div>
  );
};
