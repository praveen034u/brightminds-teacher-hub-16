import React from "react";

export const LoadingState = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-700">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        <p className="text-base font-semibold">{message}</p>
      </div>
    </div>
  );
};
