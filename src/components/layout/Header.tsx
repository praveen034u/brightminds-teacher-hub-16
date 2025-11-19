import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, BookOpen, LayoutDashboard, Building2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export const Header = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleRefreshProfile = async () => {
    try {
      toast.info('Refreshing profile...');
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to refresh profile');
      console.error('Failed to refresh profile:', error);
    }
  };

    return (
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                BrightMinds
              </div>
              <img 
                src="/brightminds-logo1.png" 
                alt="BrightMinds Logo" 
                className="h-20 w-20 object-contain"
              />
            </Link>

            {/* Header Menu Navigation - hidden on dashboard */}
            {/* Menu navigation moved to Footer */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user ? getInitials(user.full_name) : 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium hidden sm:block">{user?.full_name || 'Teacher'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRefreshProfile} className="cursor-pointer">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Profile Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    className="w-full flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 text-left text-red-600"
                    disabled={isLoggingOut}
                    onClick={async () => {
                      setIsLoggingOut(true);
                      await new Promise((resolve) => setTimeout(resolve, 500));
                      logout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
  );
};
