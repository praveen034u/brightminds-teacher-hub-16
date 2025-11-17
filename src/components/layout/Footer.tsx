import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, User, BookOpen } from 'lucide-react';

export const Footer = () => {
  const location = useLocation();

  // Hide menu on dashboard page
  if (location.pathname === '/dashboard') return null;

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm fixed bottom-0 left-0 w-full z-50 sm:hidden">
      <div className="container mx-auto px-6 py-3">
        {/* Mobile menu only */}
  <nav className="flex justify-center gap-8">
          <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6" />
          </Link>
          <Link to="/students" className="text-gray-700 hover:text-blue-600 flex items-center justify-center">
            <User className="h-6 w-6" />
          </Link>
          <Link to="/rooms" className="text-gray-700 hover:text-blue-600 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </Link>
          <Link to="/assignments" className="text-gray-700 hover:text-blue-600 flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </Link>
        </nav>
      </div>
    </footer>
  );
};
