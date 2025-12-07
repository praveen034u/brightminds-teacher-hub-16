import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, Megaphone, Settings, LogOut, Home, ChevronLeft, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Teachers', href: '/admin/teachers', icon: Users },
    { name: 'Onboard Teacher', href: '/admin/onboard', icon: UserPlus },
    { name: 'Announcements', href: '/admin/newsletters', icon: Megaphone },
    { name: 'School Settings', href: '/admin/settings', icon: Settings, disabled: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.disabled ? '#' : item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={(e) => item.disabled && e.preventDefault()}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                  {item.disabled && (
                    <span className="ml-auto text-xs">(Soon)</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
