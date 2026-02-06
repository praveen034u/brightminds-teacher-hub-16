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
  const { user, auth0UserId, isLoading, refreshProfile, markProfileComplete } = useAuth();
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
      
      // Remove empty/whitespace-only subjects and ignore 'math' if it's the only value (regardless of user state)
      let cleanSubjects = '';
      if (Array.isArray(user.subjects)) {
        let filtered = user.subjects.map(s => (s || '').trim()).filter(Boolean);
        // If only 'math' is present, treat as empty
        if (filtered.length === 1 && filtered[0].toLowerCase() === 'math') {
          filtered = [];
        }
        cleanSubjects = filtered.length > 0 ? filtered.join(', ') : '';
      }
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        school_name: user.school_name || '',
        grades_taught: Array.isArray(user.grades_taught) ? user.grades_taught.join(', ') : '',
        subjects: cleanSubjects,
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
        // Check if the profile is now complete
        // Align completeness with AuthContext logic: any of school, grades, or subjects
        const hasSchool = !!formData.school_name && formData.school_name.trim().length > 0;
        const hasGrades = formData.grades_taught.split(',').filter((g) => g.trim()).length > 0;
        const hasSubjects = formData.subjects.split(',').filter((s) => s.trim()).length > 0;
        const isProfileComplete = hasSchool || hasGrades || hasSubjects;
        if (isProfileComplete) {
          toast.success('Profile setup complete!');
          markProfileComplete();
          // Redirect to dashboard after completing first-time setup
          setTimeout(() => {
            navigate('/dashboard');
          }, 800);
        } else {
          toast.warning('Please complete all required profile fields.');
        }
        // Note: We now redirect directly after completion to avoid staying on profile
      } else {
        // For existing users, mark profile complete if any required field is now present
        const hasSchool = !!formData.school_name && formData.school_name.trim().length > 0;
        const hasGrades = formData.grades_taught.split(',').filter((g) => g.trim()).length > 0;
        const hasSubjects = formData.subjects.split(',').filter((s) => s.trim()).length > 0;
        if (hasSchool || hasGrades || hasSubjects) {
          markProfileComplete();
        }
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
      
      <main className="container mx-auto px-6 py-8 pt-32">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {isFirstTimeSetup ? 'Welcome! Complete Your Profile' : 'Teacher Profile'}
            </h1>
            <p className="text-sm text-muted-foreground">
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
                  <Label htmlFor="grades_taught">Grades Taught</Label>
                  <select
                    id="grades_taught"
                    className="w-full border rounded-md p-2"
                    value={formData.grades_taught}
                    onChange={e => setFormData({ ...formData, grades_taught: e.target.value })}
                  >
                    <option value="">Select grade</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="subjects">Subjects</Label>
                  <div className="w-full border rounded-md p-2 min-h-[48px] flex flex-wrap gap-2 bg-white mb-2">
                    {(!formData.subjects || formData.subjects.split(',').filter(s => s.trim()).length === 0) ? (
                      <span className="text-muted-foreground text-sm">Add subjects</span>
                    ) : (
                      formData.subjects.split(',').map((subject, idx, arr) => {
                        const s = subject.trim();
                        if (!s) return null;
                        return (
                          <span key={s} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm mr-1 mb-1">
                            {s}
                            <button type="button" className="ml-1 text-gray-500 hover:text-red-500" onClick={() => {
                              const filtered = arr.filter(sub => sub.trim() !== s);
                              setFormData({ ...formData, subjects: filtered.join(', ') });
                            }}>×</button>
                          </span>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Input
                      id="add_subject"
                      placeholder="Add new subject"
                      className="flex-1"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          e.preventDefault();
                          const current = formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [];
                          const newSubject = e.currentTarget.value.trim();
                          if (newSubject && !current.includes(newSubject)) {
                            setFormData({ ...formData, subjects: [...current, newSubject].join(', ') });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 bg-primary text-white rounded flex items-center justify-center"
                      title="Add subject"
                      onClick={e => {
                        const input = (e.currentTarget.parentElement?.querySelector('#add_subject') as HTMLInputElement);
                        if (input && input.value.trim()) {
                          const current = formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [];
                          const newSubject = input.value.trim();
                          if (newSubject && !current.includes(newSubject)) {
                            setFormData({ ...formData, subjects: [...current, newSubject].join(', ') });
                          }
                          input.value = '';
                        }
                      }}
                    >+
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['English','Math','Science','Social Studies','Hindi'].map(option => {
                      const selected = formData.subjects && formData.subjects.split(',').map(s => s.trim()).includes(option);
                      return (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={e => {
                              const current = formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [];
                              if (e.target.checked) {
                                if (!current.includes(option)) setFormData({ ...formData, subjects: [...current, option].join(', ') });
                              } else {
                                setFormData({ ...formData, subjects: current.filter(s => s !== option).join(', ') });
                              }
                            }}
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      );
                    })}
                  </div>
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
