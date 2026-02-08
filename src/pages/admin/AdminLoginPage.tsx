import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    if (user?.role === 'admin') {
      navigate('/admin/teachers', { replace: true });
      return;
    }

    navigate('/not-authorized', { replace: true });
  }, [isAuthenticated, isLoading, user, navigate]);

  const handleAdminLogin = () => {
    loginWithRedirect();
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="flex justify-center">
            <img
              src="/brightminds-logo1.png"
              alt="BrightMinds Logo"
              className="h-20 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Admin Portal</CardTitle>
            <CardDescription className="mt-2 text-sm">
              Sign in with your admin account to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAdminLogin} className="w-full h-12">
            Sign In as Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
