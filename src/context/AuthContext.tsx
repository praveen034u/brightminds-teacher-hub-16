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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user: auth0User, 
    isLoading: auth0Loading, 
    isAuthenticated, 
    logout: auth0Logout,
    getAccessTokenSilently
  } = useAuth0();
  const [user, setUser] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auth0UserId, setAuth0UserId] = useState<string | null>(null);

  const loadTeacher = async () => {
    // Reduced logging to prevent spam
    if (auth0Loading) {
      return;
    }

    if (!isAuthenticated || !auth0User) {
      console.log('❌ User not authenticated');
      setIsLoading(false);
      setUser(null);
      setAuth0UserId(null);
      return;
    }

    console.log('🔍 Loading teacher profile for authenticated user');
    
    const userId = auth0User.sub || '';
    setAuth0UserId(userId);
    
    console.log('📡 About to call backend /me API with:', {
      userId,
      auth0UserName: auth0User.name,
      auth0UserEmail: auth0User.email
    });

    try {
      // Get Auth0 access token for API calls
      let token = null;
      try {
        token = await getAccessTokenSilently();
      } catch (tokenError) {
        console.warn('Could not get access token, proceeding without authentication header');
      }

      // Extract real user data from Auth0
      const realUserName = auth0User.name || auth0User.email?.split('@')[0] || 'Teacher';
      const realUserEmail = auth0User.email || 'teacher@example.com';

      console.log('🔍 Auth0 User Data:', {
        sub: auth0User.sub,
        name: auth0User.name,
        email: auth0User.email,
        picture: auth0User.picture,
        extractedName: realUserName,
        extractedEmail: realUserEmail
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestBody = JSON.stringify({
        auth0_user_id: userId,
        auth0_name: realUserName,
        auth0_email: realUserEmail,
        auth0_picture: auth0User.picture || null
      });

      const apiUrl = `${getSupabaseUrl()}/functions/v1/me?auth0_user_id=${userId}`;
      console.log('📤 Making API request to:', apiUrl);

      // First, try GET request (original method)
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      console.log('📥 GET API Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const teacher = await response.json();
        console.log('✅ GET request successful, teacher data:', teacher);
        
        if (teacher && teacher.auth0_user_id) {
          console.log('✅ Valid teacher profile found via GET:', teacher);
          setUser(teacher);
        } else {
          console.log('⚠️ GET returned null/empty - teacher not found, creating new profile...');
          // Teacher doesn't exist, create one using POST
          const createResponse = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: requestBody
          });
          
          if (createResponse.ok) {
            const newTeacher = await createResponse.json();
            console.log('✅ New teacher profile created via POST:', newTeacher);
            setUser(newTeacher);
          } else {
            console.log('❌ POST also failed, creating temporary profile');
            setUser({
              id: userId,
              auth0_user_id: userId,
              full_name: realUserName,
              email: realUserEmail,
              school_name: '',
              grades_taught: [],
              subjects: [],
              preferred_language: 'English'
            });
          }
        }
      } else if (response.status === 405) {
        console.log('⚠️ GET method not supported, trying POST method...');
        
        // Try POST method with user data
        response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: requestBody
        });
        
        console.log('📥 POST API Response status:', response.status, response.statusText);
        
        if (response.ok) {
          const teacher = await response.json();
          console.log('✅ Teacher profile loaded successfully via POST:', teacher);
          setUser(teacher);
        } else {
          const errorText = await response.text();
          console.error('❌ Both GET and POST failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            supabaseUrl: getSupabaseUrl()
          });
          // Create a temporary user profile to avoid infinite loops
          console.log('🔄 Creating temporary user profile...');
          setUser({
            id: userId,
            auth0_user_id: userId,
            full_name: realUserName,
            email: realUserEmail,
            school_name: '',
            grades_taught: [],
            subjects: [],
            preferred_language: 'English'
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ GET request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          supabaseUrl: getSupabaseUrl()
        });
        // Create a temporary user profile to avoid blocking access
        console.log('🔄 Creating temporary user profile due to API failure...');
        setUser({
          id: userId,
          auth0_user_id: userId,
          full_name: realUserName,
          email: realUserEmail,
          school_name: '',
          grades_taught: [],
          subjects: [],
          preferred_language: 'English'
        });
      }
    } catch (error) {
      console.error('❌ Failed to load user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    setIsLoading(true);
    await loadTeacher();
  };

  useEffect(() => {
    loadTeacher();
  }, [auth0User, isAuthenticated, auth0Loading]);

  const logout = () => {
    setUser(null);
    setAuth0UserId(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const contextIsAuthenticated = !!user && !!auth0UserId;
  
  // Debug logging to understand authentication state mismatch
  if (isAuthenticated !== contextIsAuthenticated) {
    console.log('🔍 Auth state mismatch:', {
      auth0IsAuthenticated: isAuthenticated,
      contextIsAuthenticated,
      hasUser: !!user,
      hasAuth0UserId: !!auth0UserId,
      isLoading
    });
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      auth0UserId, 
      isLoading, 
      isAuthenticated: contextIsAuthenticated,
      logout,
      refreshProfile
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
