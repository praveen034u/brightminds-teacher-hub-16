import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🔐 AdminRoute check:', { 
    isAuthenticated, 
    isLoading, 
    hasUser: !!user,
    userRole: user?.role
  });

  if (isLoading) {
    console.log('⏳ AdminRoute: Still loading...');
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
    console.log('❌ AdminRoute: Not authenticated, redirecting to login');
    return <Navigate to="/admin" replace />;
  }

  if (user?.role !== 'admin') {
    console.log('❌ AdminRoute: User is not an admin, redirecting to not-authorized');
    return <Navigate to="/not-authorized" replace />;
  }

  console.log('✅ AdminRoute: Access granted');
  return <>{children}</>;
};
