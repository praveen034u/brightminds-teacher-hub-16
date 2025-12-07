import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { testAuth0Configuration } from '@/utils/auth0Debug';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();
  const { isNewUser, isLoading: authLoading, user } = useAuth();

  // Debug Auth0 configuration only when needed (removed automatic debug to prevent spam)

  useEffect(() => {
    // Check URL params first - if someone is explicitly trying to access teacher login
    const urlParams = new URLSearchParams(window.location.search);
    const forceTeacher = urlParams.get('teacher') === 'true';
    const studentRedirect = urlParams.get('student') === 'true';
    
    if (forceTeacher) {
      // Clear any student token if teacher login is explicitly requested
      localStorage.removeItem('student_presigned_token');
    }
    
    // Only auto-redirect to student portal if explicitly requested via URL param
    // This prevents unwanted redirects when accessing localhost normally
    const studentToken = localStorage.getItem('student_presigned_token');
    if (studentToken && studentRedirect && !forceTeacher) {
      window.location.replace(`/student-portal?token=${encodeURIComponent(studentToken)}`);
      return;
    }
    
    if (isAuthenticated && !authLoading && !window.location.pathname.includes('/dashboard') && !window.location.pathname.includes('/profile') && !window.location.pathname.includes('/admin')) {
      console.log('✅ User is authenticated, checking if profile is complete');
      console.log('🔍 LoginPage redirect check:', { isNewUser, authLoading, isAuthenticated, userRole: user?.role });
      
      // Redirect admin users to admin portal
      if (user?.role === 'admin') {
        console.log('👑 Admin user detected, redirecting to admin portal');
        navigate('/admin', { replace: true });
        return;
      }
      
      // Redirect new users to profile page first, existing users to dashboard
      if (isNewUser) {
        console.log('📝 New user detected, redirecting to profile page');
        navigate('/profile', { replace: true });
      } else {
        console.log('✅ Existing user, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, isNewUser, user, navigate]);

  const handleLogin = () => {
    console.log('🔑 Login button clicked, redirecting to teacher onboarding...');
    // Redirect to enrollment verification instead of direct Auth0 login
    navigate('/teacher-onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            BrightMinds
          </div>
          <CardTitle className="text-2xl">Welcome Back, Teacher!</CardTitle>
          <p className="text-muted-foreground">
            Sign in to manage your students and classrooms
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-center">
            <p className="mb-2 font-medium">Secure Authentication</p>
            <p className="text-muted-foreground">
              Sign in securely with Auth0 to access your teacher dashboard.
            </p>
          </div>
          
          <Button 
            onClick={handleLogin} 
            disabled={isLoading}
            className="w-full h-12 text-lg"
          >
            {isLoading ? 'Loading...' : 'Sign Up / Sign In'}
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            New teacher? You'll need an enrollment code from your admin
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
              <p className="text-red-800 font-medium mb-1">Authentication Error:</p>
              <p className="text-red-600">{error.message}</p>
              <p className="text-red-500 text-xs mt-2">
                Check console for more details
              </p>
            </div>
          )}

          {localStorage.getItem('student_presigned_token') && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                Student session detected
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const studentToken = localStorage.getItem('student_presigned_token');
                    if (studentToken) {
                      window.location.href = `/student-portal?token=${encodeURIComponent(studentToken)}`;
                    }
                  }}
                  className="w-full"
                >
                  Continue as Student
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    localStorage.removeItem('student_presigned_token');
                    window.location.reload();
                  }}
                  className="w-full text-sm"
                  size="sm"
                >
                  Clear Student Session
                </Button>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Protected by Auth0</p>
            <p className="text-xs mt-1">
              Enterprise-grade security for your classroom
            </p>
            
            {/* Debug button for development only */}
            {import.meta.env.DEV && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const result = await testAuth0Configuration();
                  const message = result.success 
                    ? '✅ Auth0 Connection: SUCCESS'
                    : `❌ Auth0 Connection: FAILED - ${result.error}`;
                  alert(message);
                }}
                className="mt-2 text-xs"
              >
                Test Auth0
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
