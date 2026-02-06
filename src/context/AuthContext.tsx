import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';

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
  role?: 'admin' | 'teacher';
  school_id?: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: Teacher | null;
  auth0UserId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  markProfileComplete: () => void;
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
  const [isNewUser, setIsNewUser] = useState(false);

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
        console.warn('Could not get access token, proceeding with apikey authentication');
      }

      // Extract real user data from Auth0
      const realUserName = auth0User.name || auth0User.email?.split('@')[0] || 'Teacher';
      const realUserEmail = auth0User.email || 'teacher@example.com';

      // Extract role from Auth0 token (from custom claim)
      // Auth0 Action injects role at: https://brightminds.ai4magic.com/role
      const auth0Role = (auth0User as any)['https://brightminds.ai4magic.com/role'] as 'admin' | 'teacher' | undefined;
      const userRole = auth0Role || 'teacher'; // Default to teacher if no role specified

      console.log('🔍 Auth0 User Data:', {
        sub: auth0User.sub,
        name: auth0User.name,
        email: auth0User.email,
        picture: auth0User.picture,
        extractedName: realUserName,
        extractedEmail: realUserEmail,
        role: userRole,
        rawAuth0User: auth0User,
        customClaim: (auth0User as any)['https://brightminds/role']
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': getSupabasePublishableKey(),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requestBody = JSON.stringify({
        auth0_user_id: userId,
        auth0_name: realUserName,
        auth0_email: realUserEmail,
        auth0_picture: auth0User.picture || null,
        role: userRole
      });

      const apiUrl = `${getSupabaseUrl()}/functions/v1/me?auth0_user_id=${userId}`;
      console.log('📤 Making API request to:', apiUrl);

      // First, try GET request (original method)
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers
      });
      
      console.log('📥 GET API Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const teacher = await response.json();
        console.log('✅ GET request successful, teacher data:', teacher);
        
        if (teacher && teacher.auth0_user_id) {
          console.log('✅ Valid teacher profile found via GET:', teacher);
          
          // Check if teacher is active
          if (teacher.is_active === false) {
            console.log('🚫 Teacher account is inactive');
            alert('Your account has been deactivated. Please contact your administrator.');
            setIsLoading(false);
            setUser(null);
            auth0Logout({ 
              logoutParams: { 
                returnTo: window.location.origin 
              } 
            });
            return;
          }
          
          // Treat invited-but-not-enrolled teachers as existing for dashboard access
          if (teacher.invitation_status === 'pending' && !teacher.enrolled_at) {
            console.log('⚠️ Teacher invited but not enrolled yet — allowing dashboard access');
            setIsNewUser(false);
            // Continue without returning to finish normal setup
          }
          
          // Merge role from Auth0 token with profile data
          teacher.role = userRole;
          
          console.log('✅ Final teacher object with role:', {
            id: teacher.id,
            email: teacher.email,
            role: teacher.role,
            fullTeacher: teacher
          });
          
          // Existing teacher: do not force profile completion flow
          setIsNewUser(false);
          setUser(teacher);
        } else {
          console.log('⚠️ GET returned null/empty - teacher not found in database');
          console.log('🚫 No valid enrollment found - user needs enrollment code');
          
          // DO NOT create a profile automatically
          // User must have been invited by admin with enrollment code
          setIsLoading(false);
          setUser(null);
          auth0Logout({ 
            logoutParams: { 
              returnTo: `${window.location.origin}/teacher-onboarding?error=no_enrollment` 
            } 
          });
          return;
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
          
          // If teacher is null, set an empty profile placeholder
          if (teacher === null) {
            console.log('No teacher profile found, user needs to complete profile');
            setIsNewUser(true);
            setUser({
              id: '',
              auth0_user_id: userId,
              full_name: realUserName,
              email: realUserEmail,
              role: userRole
            } as Teacher);
          } else {
            // Merge role from Auth0 token
            teacher.role = userRole;
            // Treat as existing teacher regardless of profile completeness
            setIsNewUser(false);
            setUser(teacher);
          }
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
          setIsNewUser(true);
          setUser({
            id: userId,
            auth0_user_id: userId,
            full_name: realUserName,
            email: realUserEmail,
            school_name: '',
            grades_taught: [],
            subjects: [],
            preferred_language: 'English',
            role: userRole
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
        setIsNewUser(true);
        setUser({
          id: userId,
          auth0_user_id: userId,
          full_name: realUserName,
          email: realUserEmail,
          school_name: '',
          grades_taught: [],
          subjects: [],
          preferred_language: 'English',
          role: userRole
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

  const markProfileComplete = () => {
    console.log('✅ Marking profile as complete');
    setIsNewUser(false);
  };

  useEffect(() => {
    loadTeacher();
  }, [auth0User, isAuthenticated, auth0Loading]);

  const logout = () => {
    setIsLoading(true);
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

  // Debug logging for isNewUser state
  console.log('🔍 AuthContext state:', {
    isNewUser,
    hasUser: !!user,
    userSchool: user?.school_name,
    userSubjects: user?.subjects,
    userGrades: user?.grades_taught,
    isLoading
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      auth0UserId, 
      isLoading, 
      // Use Auth0's authenticated state to avoid reload loops
      isAuthenticated: isAuthenticated,
      isNewUser,
      logout,
      refreshProfile,
      markProfileComplete
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
