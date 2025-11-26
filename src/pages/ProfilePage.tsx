import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { meAPI } from '@/api/edgeClient';
import { User, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, auth0UserId, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    school_name: '',
    grades_taught: '',
    subjects: '',
    preferred_language: 'English',
  });

  useEffect(() => {
    if (user) {
      // Check if this is a first-time setup (user has no school_name, grades, or subjects)
      const isNewUser = !user.school_name && 
                        (!user.grades_taught || user.grades_taught.length === 0) && 
                        (!user.subjects || user.subjects.length === 0);
      setIsFirstTimeSetup(isNewUser);
      
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        school_name: user.school_name || '',
        grades_taught: Array.isArray(user.grades_taught) ? user.grades_taught.join(', ') : '',
        subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '',
        preferred_language: user.preferred_language || 'English',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth0UserId) {
        toast.error('Authentication error. Please try logging in again.');
        setLoading(false);
        return;
      }

      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        school_name: formData.school_name,
        grades_taught: formData.grades_taught
          .split(',')
          .map((g) => g.trim())
          .filter((g) => g),
        subjects: formData.subjects
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
        preferred_language: formData.preferred_language,
      };

      console.log('📤 Updating profile with data:', { auth0UserId, updateData });

      await meAPI.update(auth0UserId, updateData);
      // Refresh the profile context to get updated user data
      await refreshProfile();
      if (isFirstTimeSetup) {
        toast.success('Profile setup complete! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        toast.success('Profile updated successfully');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Ensure user exists before rendering
  if (!user || !auth0UserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load profile. Please try logging in again.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            {!isFirstTimeSetup && (
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">
              {isFirstTimeSetup ? 'Welcome! Complete Your Profile' : 'Teacher Profile'}
            </h1>
            <p className="text-muted-foreground">
              {isFirstTimeSetup 
                ? 'Please fill in your information to get started' 
                : 'Manage your account information'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Personal Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="school_name">School Name</Label>
                  <Input
                    id="school_name"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="grades_taught">Grades Taught (comma separated)</Label>
                  <Input
                    id="grades_taught"
                    value={formData.grades_taught}
                    onChange={(e) => setFormData({ ...formData, grades_taught: e.target.value })}
                    placeholder="3, 4, 5"
                  />
                </div>

                <div>
                  <Label htmlFor="subjects">Subjects (comma separated)</Label>
                  <Input
                    id="subjects"
                    value={formData.subjects}
                    onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                    placeholder="English, Math, Science"
                  />
                </div>

                <div>
                  <Label htmlFor="preferred_language">Preferred Language</Label>
                  <Input
                    id="preferred_language"
                    value={formData.preferred_language}
                    onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Saving...' : (isFirstTimeSetup ? 'Complete Setup & Continue' : 'Save Changes')}
                </Button>
                
                {!isFirstTimeSetup && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
