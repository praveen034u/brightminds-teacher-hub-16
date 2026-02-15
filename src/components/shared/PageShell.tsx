import React from "react";
import clsx from "clsx";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const PageShell = ({ title, subtitle, actions, children, className }: PageShellProps) => {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(25,95%,95%),hsl(190,90%,96%),hsl(48,90%,96%))] text-slate-900"
      style={{ fontFamily: '"Baloo 2", "Comic Sans MS", "Trebuchet MS", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-base text-slate-700 sm:text-lg">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </header>
        <main className={clsx("space-y-6", className)}>{children}</main>
      </div>
    </div>
  );
};
