import { Sidebar } from "./Sidebar";
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = React.useState(false);

  // Sidebar width: 224px (w-56) on expanded, 64px (w-16) on collapsed
  const sidebarWidth = collapsed ? 64 : 224;

  return (
    <div className="flex-1 flex">
      {/* Sidebar: only show on desktop */}
      <div className="hidden sm:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      {/* Main content: add left margin for sidebar on desktop, and bottom padding for mobile footer */}
      <div
        className="flex-1 pb-20 sm:pb-0"
        style={{ marginLeft: undefined, ...(window.innerWidth >= 640 ? { marginLeft: sidebarWidth } : {}) }}
      >
        {children}
      </div>
    </div>
  );
};