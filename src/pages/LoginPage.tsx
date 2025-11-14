import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    // Mock login - in production this would redirect to Auth0 Universal Login
    // For now, we'll simulate a successful login
    try {
      // Store mock session
      localStorage.setItem('brightminds_auth', 'mock-teacher-1');
      
      toast.success('Welcome to BrightMinds!');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
        window.location.reload(); // Force reload to update auth state
      }, 500);
    } catch (error) {
      toast.error('Login failed. Please try again.');
      setLoading(false);
    }
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
            <p className="mb-2 font-medium">Preview Mode</p>
            <p className="text-muted-foreground">
              In production, this would use Auth0 Universal Login. 
              Click below to sign in with a demo account.
            </p>
          </div>
          
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full h-12 text-lg"
          >
            {loading ? 'Signing in...' : 'Sign In with Auth0'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo Account: Mrs. Sharma</p>
            <p className="text-xs mt-1">
              School: Bright Future Elementary
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
