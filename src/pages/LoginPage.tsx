import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading, error, user: auth0User } = useAuth0();
  const { isNewUser, isLoading: authLoading, user } = useAuth();
  const [step, setStep] = useState<'choice' | 'code' | 'verify' | 'auth'>('choice');
  const [loading, setLoading] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [teacherData, setTeacherData] = useState<any>(null);
  const [showError, setShowError] = useState(false);

  // Check for error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'no_enrollment') {
      setShowError(true);
      setStep('choice');
      toast.error('No enrollment found. Please enter your enrollment code or contact your administrator.');
    }
  }, []);

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
    const schoolId = localStorage.getItem('student_school_id');
    if (studentToken && studentRedirect && !forceTeacher) {
      const schoolParam = schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : '';
      window.location.replace(`/student-portal?token=${encodeURIComponent(studentToken)}${schoolParam}`);
      return;
    }
    
    if (isAuthenticated && !authLoading && !window.location.pathname.includes('/dashboard') && !window.location.pathname.includes('/profile') && !window.location.pathname.includes('/admin')) {
      console.log('✅ User is authenticated, checking if profile is complete');
      console.log('🔍 LoginPage redirect check:', { isNewUser, authLoading, isAuthenticated, userRole: user?.role });
      
      // If login was initiated via "Existing Teacher - Sign In", force dashboard
      try {
        const forceExisting = localStorage.getItem('existing_teacher_login') === 'true';
        if (forceExisting) {
          console.log('➡️ Existing teacher flow detected, redirecting to dashboard');
          localStorage.removeItem('existing_teacher_login');
          navigate('/dashboard', { replace: true });
          return;
        }
      } catch {}

      // Redirect admin users to admin portal
      if (user?.role === 'admin') {
        console.log('👑 Admin user detected, redirecting to admin portal');
        navigate('/admin/dashboard', { replace: true });
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

  // Handle linking enrollment after Auth0 authentication
  useEffect(() => {
    const linkEnrollment = async () => {
      if (isAuthenticated && auth0User) {
        const pendingCode = localStorage.getItem('pending_enrollment_code');
        const pendingEmail = localStorage.getItem('pending_teacher_email');
        
        if (pendingCode && pendingEmail) {
          console.log('🔗 Linking Auth0 account to enrollment:', { pendingCode, pendingEmail });
          
          try {
            // Update teacher record with auth0_user_id and set is_active to true
            const { error } = await supabase
              .from('teachers')
              .update({
                auth0_user_id: auth0User.sub,
                invitation_status: 'completed',
                enrolled_at: new Date().toISOString(),
                is_active: true,
              })
              .eq('enrollment_code', pendingCode)
              .eq('email', pendingEmail);

            if (error) {
              console.error('Error linking enrollment:', error);
              toast.error('Failed to complete enrollment. Please contact support.');
            } else {
              console.log('✅ Enrollment linked successfully');
              localStorage.removeItem('pending_enrollment_code');
              localStorage.removeItem('pending_teacher_email');
              toast.success('Account created successfully!');
              // Redirect to dashboard
              setTimeout(() => navigate('/dashboard'), 1000);
            }
          } catch (error) {
            console.error('Error linking enrollment:', error);
            toast.error('Failed to complete enrollment');
          }
        }
      }
    };

    linkEnrollment();
  }, [isAuthenticated, auth0User, navigate]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollmentCode || enrollmentCode.length !== 8) {
      toast.error('Please enter a valid 8-character enrollment code');
      return;
    }

    try {
      setLoading(true);

      // Verify enrollment code
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('enrollment_code', enrollmentCode.toUpperCase())
        .eq('invitation_status', 'pending')
        .single();

      if (error || !data) {
        toast.error('Invalid or expired enrollment code');
        return;
      }

      setTeacherData(data);
      setStep('verify');
      toast.success('Enrollment code verified!');
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Failed to verify enrollment code');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToAuth = () => {
    setStep('auth');
    toast.info('Please create your Auth0 account to continue');
  };

  const handleCreateAccount = async () => {
    // Store enrollment code in localStorage so we can link it after Auth0 signup
    localStorage.setItem('pending_enrollment_code', enrollmentCode.toUpperCase());
    localStorage.setItem('pending_teacher_email', teacherData?.email || '');
    
    // Redirect to Auth0 signup with the teacher's email pre-filled
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
        login_hint: teacherData?.email,
      },
    });
  };

  const handleExistingLogin = () => {
    // Direct login for existing teachers
    try {
      localStorage.setItem('existing_teacher_login', 'true');
    } catch {}
    loginWithRedirect();
  };

  if (isLoading || authLoading || isAuthenticated) {
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
        {/* Logo and Header */}
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center mb-2">
            <img 
              src="/brightminds-logo1.png" 
              alt="BrightMinds Logo" 
              className="h-24 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">
              <span className="block">Welcome to BrightMinds</span>
              <span className="block italic text-xl">Teacher Portal</span>
            </CardTitle>
            {step === 'choice' && (
              <CardDescription className="mt-2 text-sm">
                Please choose an option below to continue
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Step 0: Choose New or Existing */}
          {step === 'choice' && (
            <div className="space-y-4">
              {showError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-900 font-medium">⚠️ Enrollment Required</p>
                  <p className="text-sm text-red-700 mt-1">
                    You must have a valid enrollment code from your school administrator to create an account.
                  </p>
                </div>
              )}
              
              <Button 
                onClick={() => setStep('code')} 
                className="w-full h-14 text-base bg-primary hover:bg-primary/90"
              >
                <KeyRound className="mr-2 h-5 w-5" />
                New Teacher - I have an enrollment code
              </Button>
              
              <Button 
                onClick={handleExistingLogin}
                variant="outline"
                className="w-full h-14 text-base"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Existing Teacher - Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New teachers need to obtain an enrollment code from their administrator
              </p>

              <div className="text-center text-sm text-muted-foreground mt-6 pt-4 border-t">
                <p className="mb-1">Sign in securely with Auth0 to access</p>
                <p>your teacher dashboard</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm mt-4">
                  <p className="text-red-800 font-medium mb-1">Authentication Error:</p>
                  <p className="text-red-600">{error.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Enter Enrollment Code */}
          {step === 'code' && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Enter Your Enrollment Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your school administrator has sent you an 8-character code
                </p>
              </div>
              
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Enrollment Code</Label>
                  <Input
                    id="code"
                    placeholder="XXXXXXXX"
                    value={enrollmentCode}
                    onChange={(e) =>
                      setEnrollmentCode(e.target.value.toUpperCase())
                    }
                    maxLength={8}
                    className="text-center text-2xl font-bold tracking-widest"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 8-character code from your invitation email
                  </p>
                </div>

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  onClick={() => setStep('choice')}
                  className="text-sm"
                >
                  ← Back to login options
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Verify Information */}
          {step === 'verify' && teacherData && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Verify Your Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please confirm that this information is correct
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 mb-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{teacherData.full_name}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{teacherData.email}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">School</Label>
                  <p className="font-medium">{teacherData.school_name || 'Not specified'}</p>
                </div>

                {teacherData.grades_taught && teacherData.grades_taught.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Grades</Label>
                    <p className="font-medium">
                      {teacherData.grades_taught.join(', ')}
                    </p>
                  </div>
                )}

                {teacherData.subjects && teacherData.subjects.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Subjects</Label>
                    <p className="font-medium">
                      {teacherData.subjects.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button onClick={handleProceedToAuth} className="w-full h-12">
                  Looks Good - Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStep('choice')}
                  className="w-full"
                >
                  ← Back to start
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Create Auth0 Account */}
          {step === 'auth' && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Create Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your secure login credentials to access BrightMinds
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Next Step:
                </p>
                <p className="text-sm text-blue-800">
                  You'll be redirected to create your secure account. Use your email:{' '}
                  <strong className="block mt-1">{teacherData?.email}</strong>
                </p>
              </div>

              <Button onClick={handleCreateAccount} className="w-full h-12" size="lg">
                Create Account & Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
