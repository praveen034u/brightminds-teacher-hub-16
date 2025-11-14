import React, { createContext, useContext, useState, useEffect } from 'react';

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
  auth0UserId: string;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Mock auth0_user_id for preview - in production this would come from Auth0 JWT
  const auth0UserId = 'mock-teacher-1';

  useEffect(() => {
    // In production, this would validate the Auth0 JWT and extract the user ID
    // For preview, we'll use a mock teacher
    const loadUser = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/me?auth0_user_id=${auth0UserId}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const teacher = await response.json();
          setUser(teacher);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = () => {
    // In production, this would call Auth0's logout
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, auth0UserId, isLoading, logout }}>
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
