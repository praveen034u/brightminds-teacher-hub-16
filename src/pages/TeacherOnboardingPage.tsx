import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

const TeacherOnboardingPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, user: auth0User } = useAuth0();
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

  // Handle linking enrollment after Auth0 authentication
  useEffect(() => {
    const linkEnrollment = async () => {
      if (isAuthenticated && auth0User) {
        const pendingCode = localStorage.getItem('pending_enrollment_code');
        const pendingEmail = localStorage.getItem('pending_teacher_email');
        
        if (pendingCode && pendingEmail) {
          console.log('🔗 Linking Auth0 account to enrollment:', { pendingCode, pendingEmail });
          
          try {
            // Update teacher record with auth0_user_id
            const { error } = await supabase
              .from('teachers')
              .update({
                auth0_user_id: auth0User.sub,
                invitation_status: 'completed',
                enrolled_at: new Date().toISOString(),
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

  const handleExistingLogin = () => {
    // Direct login for existing teachers
    loginWithRedirect();
  };

  if (isAuthenticated) {
    // If already authenticated, redirect to dashboard
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">BrightMinds</h1>
          <p className="text-gray-600">Teacher Portal</p>
        </div>

        {/* Step 0: Choose New or Existing */}
        {step === 'choice' && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to BrightMinds</CardTitle>
              <CardDescription>
                Are you a new teacher or do you already have an account?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                className="w-full h-12"
                size="lg"
              >
                <KeyRound className="mr-2 h-5 w-5" />
                New Teacher - I have an enrollment code
              </Button>
              
              <Button 
                onClick={handleExistingLogin}
                variant="outline"
                className="w-full h-12"
                size="lg"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Existing Teacher - Sign In
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                New teachers must have an enrollment code from their school administrator
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Enter Enrollment Code */}
        {step === 'code' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Enter Your Enrollment Code
              </CardTitle>
              <CardDescription>
                Your school administrator has sent you an 8-character code to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <p className="text-xs text-muted-foreground">
                    Enter the 8-character code from your invitation email
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
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

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Don't have a code?</p>
                <p>Contact your school administrator</p>
                <Button
                  variant="link"
                  onClick={() => setStep('choice')}
                  className="mt-2"
                >
                  ← Back to options
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify Information */}
        {step === 'verify' && teacherData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Verify Your Information
              </CardTitle>
              <CardDescription>
                Please confirm that this information is correct
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Full Name</Label>
                  <p className="font-medium">{teacherData.full_name}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Email</Label>
                  <p className="font-medium">{teacherData.email}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">School</Label>
                  <p className="font-medium">{teacherData.school_name || 'Not specified'}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Grades</Label>
                  <p className="font-medium">
                    {teacherData.grades_taught?.join(', ') || 'Not specified'}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Subjects</Label>
                  <p className="font-medium">
                    {teacherData.subjects?.join(', ') || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={handleProceedToAuth} className="w-full">
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
            </CardContent>
          </Card>
        )}

        {/* Step 3: Create Auth0 Account */}
        {step === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>
                Set up your secure login credentials to access BrightMinds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Next Step:</strong>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  You'll be redirected to create your secure account. Use your email:{' '}
                  <strong>{teacherData?.email}</strong>
                </p>
              </div>

              <Button onClick={handleCreateAccount} className="w-full" size="lg">
                Create Account & Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherOnboardingPage;
