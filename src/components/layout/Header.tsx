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
import { User, LogOut, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const Header = () => {
  const { user, logout, refreshProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      <header className="border-b border-border bg-card shadow-sm fixed top-0 left-0 right-0 w-full z-50 h-24">
        <div className="container mx-auto px-6 h-full">
          <div className="flex items-center justify-between h-full relative">
            {/* Logos - Left Side */}
            <Link to="/dashboard" className="flex items-center gap-4 group">
              {/* BrightMinds Logo */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Bulb Head Glow - Focused on top part */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-radial from-yellow-300/80 via-yellow-400/50 to-transparent rounded-full blur-2xl animate-bulb-shine"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-radial from-white/60 via-yellow-200/50 to-transparent rounded-full blur-xl animate-bulb-shine-delayed"></div>
                
                {/* Breathing Glow Effect - Much More Visible! */}
                <div className="absolute inset-0 bg-gradient-radial from-yellow-400/50 via-yellow-300/35 to-yellow-200/20 rounded-full blur-3xl animate-breathing-human"></div>
                
                {/* Main Logo - With Brightness Animation */}
                <img
                  src="/brightminds-logo1.png"
                  alt="BrightMinds Logo"
                  className="h-28 w-28 object-contain relative z-10 animate-bulb-brightness"
                />
                
                {/* Enhanced Sparkles on Bulb Head */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full animate-sparkle-burst shadow-lg"></div>
                <div className="absolute top-5 left-10 w-2 h-2 bg-yellow-100 rounded-full animate-sparkle-burst-delayed"></div>
                <div className="absolute top-6 right-10 w-2.5 h-2.5 bg-white/80 rounded-full animate-sparkle-burst-delayed-2"></div>
                
                {/* Light rays - More visible */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-yellow-200/70 to-transparent blur-sm animate-light-ray"></div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-5 bg-gradient-to-b from-white/60 to-transparent blur-sm animate-light-ray-delayed rotate-12"></div>
              </div>
              
              {/* School Logo */}
              <div className="flex items-center justify-center w-20 h-20">
                <img
                  src="https://stanleymills.peelschools.org/images/logo.svg"
                  alt="Stanley Mills Public School Logo"
                  className="h-16 w-16 object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </Link>
            
            {/* School Name - Centered & Clickable */}
            <Link to="/dashboard" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center hover:opacity-80 transition-opacity cursor-pointer">
              <h1 className="text-3xl font-semibold tracking-wide bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Stanly Mills Public School
              </h1>
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
