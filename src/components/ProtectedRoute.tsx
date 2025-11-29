import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, auth0UserId, isNewUser } = useAuth();
  const location = useLocation();

  // Debug logging for ProtectedRoute
  console.log('🔒 ProtectedRoute check:', { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user,
    hasAuth0UserId: !!auth0UserId 
  });

  if (isLoading) {
    console.log('⏳ ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // If user is new and trying to access any route other than profile, redirect to profile
  if (isNewUser && location.pathname !== '/profile') {
    console.log('📝 ProtectedRoute: New user detected, redirecting to profile page');
    return <Navigate to="/profile" replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
