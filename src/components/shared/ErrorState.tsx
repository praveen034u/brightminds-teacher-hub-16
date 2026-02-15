import React from "react";

type ErrorStateProps = {
  title?: string;
  message: string;
  action?: React.ReactNode;
};

export const ErrorState = ({ title = "Oops!", message, action }: ErrorStateProps) => {
  return (
    <div className="rounded-3xl border border-rose-100 bg-white/80 p-6 text-center shadow-lg">
      <h2 className="text-xl font-bold text-rose-600">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};
