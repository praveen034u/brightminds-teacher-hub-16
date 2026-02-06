import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, auth0UserId, isNewUser } = useAuth();
  const location = useLocation();
  const isReload = (() => {
    try {
      const nav = (performance.getEntriesByType('navigation') as any)[0];
      return nav && nav.type === 'reload';
    } catch {
      return false;
    }
  })();

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
    // If we reach here, auth has finished loading and user isn't authenticated.
    // Redirect to root (LoginPage) since /login route doesn't exist.
    console.log('🚪 ProtectedRoute: Unauthenticated after load, redirecting to root');
    return <Navigate to="/" replace />;
  }

  // If user is new and trying to access any route other than profile, redirect to profile
  // Skip redirect on hard reload to keep current page
  if (isNewUser && location.pathname !== '/profile' && !isReload) {
    // Skip redirect to profile if the flow was initiated via Existing Teacher sign-in
    try {
      const forceExisting = localStorage.getItem('existing_teacher_login') === 'true';
      if (forceExisting) {
        console.log('🛑 ProtectedRoute: Existing teacher sign-in, skipping profile redirect');
      } else {
        console.log('📝 ProtectedRoute: New user detected, redirecting to profile page');
        return <Navigate to="/profile" replace />;
      }
    } catch {
      console.log('📝 ProtectedRoute: New user detected, redirecting to profile page');
      return <Navigate to="/profile" replace />;
    }
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};
