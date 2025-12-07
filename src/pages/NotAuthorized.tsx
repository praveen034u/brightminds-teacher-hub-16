import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NotAuthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Admin privileges are required.
          </p>

          {user && (
            <div className="bg-gray-50 rounded-md p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Logged in as:</span> {user.email}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Role:</span> {user.role || 'teacher'}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorized;
