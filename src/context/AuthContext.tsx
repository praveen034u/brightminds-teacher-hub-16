import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getSupabaseUrl } from '@/config/supabase';

interface Teacher {
  id: string;
  auth0_user_id: string;
  full_name: string;
  email: string;
  school_name?: string;
  grades_taught?: string[];
  subjects?: string[];
  preferred_language?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: Teacher | null;
  auth0UserId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: auth0User, isLoading: auth0Loading, isAuthenticated, logout: auth0Logout } = useAuth0();
  const [user, setUser] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auth0UserId, setAuth0UserId] = useState<string | null>(null);

  useEffect(() => {
    const loadTeacher = async () => {
      if (auth0Loading) {
        return;
      }

      if (!isAuthenticated || !auth0User) {
        setIsLoading(false);
        setUser(null);
        setAuth0UserId(null);
        return;
      }

      const userId = auth0User.sub || '';
      setAuth0UserId(userId);

      try {
        const response = await fetch(
          `${getSupabaseUrl()}/functions/v1/me?auth0_user_id=${userId}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const teacher = await response.json();
          setUser(teacher);
        } else {
          console.error('Failed to load teacher profile');
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacher();
  }, [auth0User, isAuthenticated, auth0Loading]);

  const logout = () => {
    setUser(null);
    setAuth0UserId(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      auth0UserId, 
      isLoading, 
      isAuthenticated: !!user && !!auth0UserId,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
