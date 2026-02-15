import React from "react";

type TextEditorCardProps = {
  value: string;
  onChange: (value: string) => void;
  onPasteFromClipboard?: () => void;
};

export const TextEditorCard = ({ value, onChange, onPasteFromClipboard }: TextEditorCardProps) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white/80 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-indigo-600">Friendly Writing Editor</p>
        {onPasteFromClipboard && (
          <button
            type="button"
            onClick={onPasteFromClipboard}
            className="rounded-full bg-indigo-500 px-4 py-1 text-xs font-semibold text-white"
          >
            Paste from Clipboard
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Start your story here..."
        rows={10}
        className="mt-4 w-full rounded-2xl border border-indigo-100 bg-white/70 p-4 text-base text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
};
