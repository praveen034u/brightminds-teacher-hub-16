import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    loginWithRedirect();
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
            {isLoading ? 'Loading...' : 'Sign In with Auth0'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Protected by Auth0</p>
            <p className="text-xs mt-1">
              Enterprise-grade security for your classroom
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
