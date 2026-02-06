import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGradeFilter } from '@/contexts/GradeFilterContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { studentsAPI } from '@/api/edgeClient';
import { UserPlus, Upload, Trash2, Edit, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const StudentsPage = () => {
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();
  const { selectedGrades } = useGradeFilter();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    grade: '',
    date_of_birth: '',
    primary_language: 'English',
    skills: '',
    additional_details: '',
  });
  const [csvText, setCsvText] = useState('');

  // Filter students by selected grades
  const filteredStudents = useMemo(() => {
    if (selectedGrades.length === 0) {
      return students;
    }
    return students.filter((student) => 
      student.grade && selectedGrades.includes(student.grade)
    );
  }, [students, selectedGrades]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      setLoading(false);
      return;
    }
    loadStudents();
  }, [auth0UserId, authLoading, isAuthenticated]);

  const loadStudents = async () => {
    try {
      if (authLoading || !isAuthenticated || !auth0UserId) {
        return;
      }
      setLoading(true);
      const data = await studentsAPI.list(auth0UserId);
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentData = {
        ...formData,
        skills: formData.skills ? JSON.parse(`["${formData.skills.split(',').map(s => s.trim()).join('","')}"]`) : [],
        grade: formData.grade,
      };
      await studentsAPI.create(auth0UserId, studentData);
      toast.success('Student added successfully');
      setShowAddDialog(false);
      setFormData({
        name: '',
        email: '',
        gender: '',
        grade: '',
        date_of_birth: '',
        primary_language: 'English',
        skills: '',
        additional_details: '',
      });
      loadStudents();
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await studentsAPI.delete(auth0UserId, id);
      toast.success('Student deleted');
      loadStudents();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const handleCopyAccessLink = (accessUrl: string | null) => {
    if (!accessUrl) {
      toast.error('No access link available for this student');
      return;
    }
    
    navigator.clipboard.writeText(accessUrl)
      .then(() => {
        toast.success('Student access link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const studentsData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const student: any = {};
        headers.forEach((header, index) => {
          if (header === 'name') student.name = values[index];
          if (header === 'gender') student.gender = values[index];
          if (header === 'date_of_birth') student.date_of_birth = values[index];
          if (header === 'primary_language') student.primary_language = values[index];
          if (header === 'skills') student.skills = values[index] ? JSON.parse(`["${values[index].split(';').join('","')}"]`) : [];
        });
        return student;
      });

      await studentsAPI.bulkUpload(auth0UserId, studentsData);
      toast.success(`Successfully uploaded ${studentsData.length} students`);
      setShowCsvDialog(false);
      setCsvText('');
      loadStudents();
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error('Failed to upload CSV. Please check format.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      {/* Add bottom padding for mobile footer */}
      <main className="container mx-auto px-6 py-8 pt-32 pb-20 sm:pb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-4 hover:bg-purple-50 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Students</h1>
              <p className="text-sm text-muted-foreground">Manage your students</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto rounded-xl shadow-lg">
                <DialogHeader>
                  <DialogTitle>Upload Students from CSV</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCsvUpload} className="space-y-4">
                  <div>
                    <Label>CSV Data</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Format: name,gender,date_of_birth,primary_language,skills (semicolon separated)
                    </p>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="w-full min-h-[200px] p-2 border rounded-md"
                      placeholder="name,gender,date_of_birth,primary_language,skills
Anaya Kumar,Female,2015-03-15,English,Reading;Math
Raj Patel,Male,2014-08-22,Hindi,Science;Art"
                    />
                  </div>
                  <Button type="submit" className="w-full">Upload Students</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="p-2 rounded-1xl shadow-lg border border-gray-200 bg-white flex justify-center items-center overflow-hidden">
                <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
                  <div className="px-8 pt-2 pb-0">
                    <h2 className="text-2xl font-bold text-center mb-6">Add New Student</h2>
                  </div>
                  <div className="px-8 pb-8">
                    <form onSubmit={handleAddStudent} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="font-medium">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="student@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gender" className="font-medium">Gender</Label>
                    <Input
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="grade" className="font-medium">Grade</Label>
                    <select
                      id="grade"
                      className="w-full border rounded-md p-2"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
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
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dob" className="font-medium">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="language" className="font-medium">Primary Language</Label>
                    <select
                      id="language"
                      className="w-full border rounded-md p-2"
                      value={formData.primary_language}
                      onChange={(e) => setFormData({ ...formData, primary_language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="details" className="font-medium">Additional Details</Label>
                    <Input
                      id="details"
                      value={formData.additional_details}
                      onChange={(e) => setFormData({ ...formData, additional_details: e.target.value })}
                    />
                  </div>
                      <Button type="submit" className="w-full">Add Student</Button>
                    </form>
                  </div>
                </div>
              </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              All Students ({filteredStudents.length}
              {selectedGrades.length > 0 && ` of ${students.length}`})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email || '-'}</TableCell>
                      <TableCell>{student.gender || '-'}</TableCell>
                      <TableCell>{student.grade || '-'}</TableCell>
                      <TableCell>
                        {student.date_of_birth
                          ? new Date(student.date_of_birth).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>{student.primary_language}</TableCell>
                      <TableCell>
                        {Array.isArray(student.skills) && student.skills.length > 0
                          ? student.skills.join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyAccessLink(student.access_url)}
                            title="Copy student portal link"
                          >
                            <Copy className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">No students yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first student to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentsPage;
