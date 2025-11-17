import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, User, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Hide sidebar on dashboard page
  // Sidebar should always be visible, including on dashboard

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-56'}`}
      style={{ marginTop: '120px', height: 'calc(100vh - 120px)' }} // Increased marginTop to move sidebar further down
    >
      {/* Collapse/Expand Button */}
      <div className="flex items-center justify-end p-2 border-b border-border" style={{ minHeight: '56px' }}>
        <button
          className="rounded-full p-2 hover:bg-accent focus:outline-none"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      {/* Menu Items */}
      <nav className="flex-1 flex flex-col gap-2 mt-8">
        <Link to="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-accent transition-colors ${collapsed ? 'justify-center' : ''}`}> 
          <LayoutDashboard className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Dashboard</span>}
        </Link>
        <Link to="/students" className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-accent transition-colors ${collapsed ? 'justify-center' : ''}`}> 
          <User className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Students</span>}
        </Link>
        <Link to="/rooms" className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-accent transition-colors ${collapsed ? 'justify-center' : ''}`}> 
          <Building2 className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Rooms</span>}
        </Link>
        <Link to="/assignments" className={`flex items-center gap-3 px-4 py-3 rounded-md hover:bg-accent transition-colors ${collapsed ? 'justify-center' : ''}`}> 
          <BookOpen className="h-5 w-5" />
          {!collapsed && <span className="font-medium">Assignments</span>}
        </Link>
      </nav>
    </aside>
  );
};
