import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex-1 flex">
      {/* Sidebar: only show on desktop */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>
      {/* Main content: add bottom padding for mobile footer */}
      <div className="flex-1 pb-20 sm:pb-0">
        {children}
      </div>
    </div>
  );
};