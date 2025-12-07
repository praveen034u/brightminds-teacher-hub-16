import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Mail, Loader2, Copy, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OnboardingResult {
  teacherId: string;
  enrollmentCode: string;
  accessToken: string;
  email: string;
  name: string;
}

const GRADES = ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'Foreign Language',
];

const AdminOnboardTeacher = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<OnboardingResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schoolName: user?.school_name || '',
    gradesTeaching: [] as string[],
    subjects: [] as string[],
    additionalNotes: '',
  });

  const handleGradeToggle = (grade: string) => {
    setFormData((prev) => ({
      ...prev,
      gradesTeaching: prev.gradesTeaching.includes(grade)
        ? prev.gradesTeaching.filter((g) => g !== grade)
        : [...prev.gradesTeaching, grade],
    }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const generateEnrollmentCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generateAccessToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const sendOnboardingEmail = async (result: OnboardingResult) => {
    try {
      // Call Supabase Edge Function to send email
      const { error } = await supabase.functions.invoke('send-teacher-onboarding-email', {
        body: {
          teacherEmail: result.email,
          teacherName: result.name,
          enrollmentCode: result.enrollmentCode,
          schoolName: formData.schoolName,
          adminName: user?.full_name,
        },
      });

      if (error) {
        console.error('Email sending error:', error);
        toast.warning('Teacher created but email could not be sent. Please share the enrollment code manually.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email error:', error);
      toast.warning('Teacher created but email could not be sent. Please share the enrollment code manually.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.gradesTeaching.length === 0) {
      toast.error('Please select at least one grade');
      return;
    }

    if (formData.subjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    try {
      setLoading(true);

      const enrollmentCode = generateEnrollmentCode();
      const accessToken = generateAccessToken();

      // Create teacher record without auth0_user_id (they'll set this up later)
      const { data: teacher, error: createError } = await supabase
        .from('teachers')
        .insert({
          full_name: formData.fullName,
          email: formData.email,
          school_name: formData.schoolName,
          school_id: user?.school_id,
          grades_taught: formData.gradesTeaching,
          subjects: formData.subjects,
          role: 'teacher',
          is_active: true, // Active immediately when created by admin
          preferred_language: 'English',
          // Add enrollment fields (you'll need to add these columns to the table)
          enrollment_code: enrollmentCode,
          access_token: accessToken,
          invitation_status: 'pending',
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating teacher:', createError);
        toast.error(`Failed to create teacher: ${createError.message}`);
        return;
      }

      const result: OnboardingResult = {
        teacherId: teacher.id,
        enrollmentCode,
        accessToken,
        email: formData.email,
        name: formData.fullName,
      };

      // Try to send email
      await sendOnboardingEmail(result);

      setOnboardingResult(result);
      setShowSuccessDialog(true);
      toast.success('Teacher onboarding initiated successfully!');

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        schoolName: user?.school_name || '',
        gradesTeaching: [],
        subjects: [],
        additionalNotes: '',
      });
    } catch (error) {
      console.error('Error onboarding teacher:', error);
      toast.error('Failed to onboard teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Onboard New Teacher</h2>
        <p className="text-muted-foreground mt-2">
          Create a new teacher account and send them an invitation to complete their profile
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Teacher Information
          </CardTitle>
          <CardDescription>
            Enter the teacher's basic information. They will receive an enrollment code via email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                placeholder="School Name"
                value={formData.schoolName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, schoolName: e.target.value }))
                }
              />
            </div>

            {/* Grades */}
            <div className="space-y-2">
              <Label>
                Grades Teaching <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {GRADES.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => handleGradeToggle(grade)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      formData.gradesTeaching.includes(grade)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects */}
            <div className="space-y-2">
              <Label>
                Subjects <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => handleSubjectToggle(subject)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      formData.subjects.includes(subject)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information..."
                value={formData.additionalNotes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Create & Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Teacher Onboarding Initiated
            </DialogTitle>
            <DialogDescription>
              The teacher has been created successfully. Share these credentials with them.
            </DialogDescription>
          </DialogHeader>

          {onboardingResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Teacher Name</Label>
                  <p className="font-medium">{onboardingResult.name}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Email Address</Label>
                  <p className="font-medium">{onboardingResult.email}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Enrollment Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-lg font-bold tracking-wider">
                      {onboardingResult.enrollmentCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(onboardingResult.enrollmentCode, 'code')
                      }
                    >
                      {copiedField === 'code' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Next Steps:</strong>
                </p>
                <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                  <li>An email has been sent to the teacher with their enrollment code</li>
                  <li>The teacher should visit the onboarding page and enter their code</li>
                  <li>They will create their Auth0 account and complete their profile</li>
                  <li>Once completed, you can activate their account</li>
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOnboardTeacher;
