import { Sidebar } from "./Sidebar";
import React from "react";
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = React.useState(false);

  // Sidebar width: 224px (w-56) on expanded, 64px (w-16) on collapsed
  const sidebarWidth = collapsed ? 64 : 224;

  const location = useLocation();

  return (
    <div className="flex-1 flex">
      {/* Sidebar: only show on desktop */}
      <div className="hidden sm:block">
        {/* Use location.pathname as key so the Sidebar remounts when the route changes/refreshes */}
        <Sidebar key={location.pathname} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      {/* Main content: add left margin for sidebar on desktop, and bottom padding for mobile footer */}
      <div
        className="flex-1 pb-20 sm:pb-0"
        style={{ paddingTop: 'var(--header-height, 76px)', marginLeft: undefined, ...(window.innerWidth >= 640 ? { marginLeft: sidebarWidth } : {}) }}
      >
        {children}
      </div>
    </div>
  );
};