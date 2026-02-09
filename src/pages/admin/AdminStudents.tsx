import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { UserPlus, Trash2, Pencil, Loader2 } from 'lucide-react';

const GRADES = ['Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

interface TeacherOption {
  id: string;
  full_name: string;
  school_id?: string;
}

interface StudentRecord {
  id: string;
  name: string;
  email?: string | null;
  gender?: string | null;
  grade?: string | null;
  date_of_birth?: string | null;
  primary_language?: string | null;
  skills?: string[] | null;
  additional_details?: string | null;
  teacher_id: string;
  teachers?: {
    id: string;
    full_name: string;
  } | null;
}

const initialForm = {
  name: '',
  email: '',
  gender: '',
  grade: '',
  date_of_birth: '',
  primary_language: 'English',
  skills: '',
  additional_details: '',
  teacher_id: '',
};

const AdminStudents = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; student: StudentRecord | null }>({
    open: false,
    student: null,
  });
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadTeachers = async () => {
    try {
      let query = supabase
        .from('teachers')
        .select('id, full_name, school_id')
        .order('full_name', { ascending: true });

      if (user?.school_id) {
        query = query.eq('school_id', user.school_id);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      setTeachers(data || []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  const loadStudents = async (page = currentPage) => {
    try {
      setLoading(true);
      let query = supabase
        .from('students')
        .select('id, name, email, gender, grade, date_of_birth, primary_language, skills, additional_details, teacher_id, teachers:teacher_id (id, full_name, school_id)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (user?.school_id) {
        query = query.eq('teachers.school_id', user.school_id);
      }

      if (selectedGrade) {
        query = query.eq('grade', selectedGrade);
      }

      if (selectedTeacher) {
        query = query.eq('teacher_id', selectedTeacher);
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await query.range(start, end);
      if (error) {
        throw error;
      }

      setStudents((data as StudentRecord[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [user?.school_id]);

  useEffect(() => {
    loadStudents(currentPage);
  }, [user?.school_id, selectedGrade, selectedTeacher, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedTeacher]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const openCreateDialog = () => {
    setEditingStudent(null);
    setFormData(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      gender: student.gender || '',
      grade: student.grade || '',
      date_of_birth: student.date_of_birth || '',
      primary_language: student.primary_language || 'English',
      skills: Array.isArray(student.skills) ? student.skills.join(', ') : '',
      additional_details: student.additional_details || '',
      teacher_id: student.teacher_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.grade || !formData.teacher_id) {
      toast.error('Name, grade, and assigned teacher are required');
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email || null,
      gender: formData.gender || null,
      grade: formData.grade,
      date_of_birth: formData.date_of_birth || null,
      primary_language: formData.primary_language || 'English',
      skills: formData.skills
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      additional_details: formData.additional_details || null,
      teacher_id: formData.teacher_id,
    };

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id);
        if (error) {
          throw error;
        }
        toast.success('Student updated successfully');
      } else {
        const { error } = await supabase
          .from('students')
          .insert(payload);
        if (error) {
          throw error;
        }
        toast.success('Student onboarded successfully');
      }

      setDialogOpen(false);
      setEditingStudent(null);
      setFormData(initialForm);
      loadStudents();
    } catch (error) {
      console.error('Failed to save student:', error);
      toast.error('Failed to save student');
    }
  };

  const confirmOffboard = (student: StudentRecord) => {
    setConfirmDialog({ open: true, student });
  };

  const handleOffboard = async () => {
    const student = confirmDialog.student;
    if (!student) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);
      if (error) {
        throw error;
      }
      toast.success('Student offboarded');
      loadStudents();
    } catch (error) {
      console.error('Failed to offboard student:', error);
      toast.error('Failed to offboard student');
    } finally {
      setConfirmDialog({ open: false, student: null });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Students</h2>
          <p className="text-sm text-gray-500">Onboard, offboard, and assign grades</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Onboard Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Edit Student' : 'Onboard Student'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-name">Name *</Label>
                <Input
                  id="student-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-email">Email</Label>
                <Input
                  id="student-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-teacher">Assigned Teacher *</Label>
                <select
                  id="student-teacher"
                  className="w-full border rounded-md p-2"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-grade">Grade *</Label>
                <select
                  id="student-grade"
                  className="w-full border rounded-md p-2"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  required
                >
                  <option value="">Select grade</option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-gender">Gender</Label>
                <Input
                  id="student-gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-dob">Date of Birth</Label>
                <Input
                  id="student-dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-language">Primary Language</Label>
                <Input
                  id="student-language"
                  value={formData.primary_language}
                  onChange={(e) => setFormData({ ...formData, primary_language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-skills">Skills (comma separated)</Label>
                <Input
                  id="student-skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-details">Additional Details</Label>
                <Input
                  id="student-details"
                  value={formData.additional_details}
                  onChange={(e) => setFormData({ ...formData, additional_details: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingStudent ? 'Save Changes' : 'Onboard Student'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Label htmlFor="filter-grade" className="text-sm">Grade</Label>
            <select
              id="filter-grade"
              className="border rounded-md p-2 text-sm"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">All</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="filter-teacher" className="text-sm">Teacher</Label>
            <select
              id="filter-teacher"
              className="border rounded-md p-2 text-sm"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="">All</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            Showing {students.length} of {totalCount} student(s)
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.teachers?.full_name || '-'}</TableCell>
                  <TableCell>{student.grade || '-'}</TableCell>
                  <TableCell>{student.email || '-'}</TableCell>
                  <TableCell>{student.primary_language || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(student)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => confirmOffboard(student)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No students yet. Onboard your first student.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, student: confirmDialog.student })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {confirmDialog.student?.name || 'this student'} and their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOffboard}>Offboard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStudents;
