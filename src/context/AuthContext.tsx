import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseUrl } from '@/config/supabase';
import { useNavigate } from 'react-router-dom';

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
  const [user, setUser] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auth0UserId, setAuth0UserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const storedAuth = localStorage.getItem('brightminds_auth');
      
      if (!storedAuth) {
        setIsLoading(false);
        return;
      }

      setAuth0UserId(storedAuth);

      try {
        const response = await fetch(
          `${getSupabaseUrl()}/functions/v1/me?auth0_user_id=${storedAuth}`,
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
          // Invalid session, clear it
          localStorage.removeItem('brightminds_auth');
          setAuth0UserId(null);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('brightminds_auth');
        setAuth0UserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const logout = () => {
    // Clear session
    localStorage.removeItem('brightminds_auth');
    setUser(null);
    setAuth0UserId(null);
    
    // Redirect to login
    window.location.href = '/';
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
