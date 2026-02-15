import React, { useEffect } from "react";

type ToastProps = {
  message: string;
  variant?: "success" | "error" | "info";
  onDismiss: () => void;
};

const variantStyles: Record<NonNullable<ToastProps["variant"]>, string> = {
  success: "bg-emerald-500 text-white",
  error: "bg-rose-500 text-white",
  info: "bg-sky-500 text-white",
};

export const Toast = ({ message, variant = "info", onDismiss }: ToastProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 2800);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50">
      <div
        className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${variantStyles[variant]}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
};
