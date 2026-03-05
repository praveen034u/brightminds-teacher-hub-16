import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface School {
  school_id: string;
  // renamed column in DB from `school_name` to `name`
  name: string;
}

interface AcademicYear {
  academic_year_id: string;
  // renamed column in DB from `year` to `year_name`
  year_name: string;
}

interface ClassConfiguration {
  class_id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  grade: string;
  section: string;
  room_number: string;
  maximum_student_count: number;
  class_teacher_id: string | null;
  associate_teacher_id: string | null;
  number_of_periods: number;
  is_active: boolean;
  created_at: string;
  // flattened values from related tables; names kept for legacy UI
  school_name?: string;
  academic_year?: string;
}

interface FormData {
  school_id: string;
  academic_year_id: string;
  grade: string;
  section: string;
  room_number: string;
  maximum_student_count: number;
  number_of_periods: number;
  is_active: boolean;
}

const ClassConfigurations = () => {
  const { user } = useAuth();
  
  // Data states
  const [classes, setClasses] = useState<ClassConfiguration[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassConfiguration | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<FormData>({
    school_id: '',
    academic_year_id: '',
    grade: '',
    section: '',
    room_number: '',
    maximum_student_count: 30,
    number_of_periods: 5,
    is_active: true,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        // fetch new `name` column instead of old `school_name`
        .select('school_id, name');
      
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Fetch academic years
      const { data: yearsData, error: yearsError } = await supabase
        .from('academic_years')
        // fetch renamed column
        .select('academic_year_id, year_name');
      
      if (yearsError) throw yearsError;
      setAcademicYears(yearsData || []);

      // Fetch class configurations with school and academic year details
      const { data: classesData, error: classesError } = await supabase
        .from('class_configurations')
        // comments and newlines inside the select string cause parse errors
        .select(`*,
          schools:school_id(name),
          academic_years:academic_year_id(year_name)`)
        .order('created_at', { ascending: false });
      
      if (classesError) throw classesError;
      
      // Transform data to flatten relationships
      const transformedData = (classesData || []).map((cls: any) => ({
        ...cls,
        // map renamed fields back into legacy property names for UI
        school_name: cls.schools?.name || 'N/A',
        academic_year: cls.academic_years?.year_name || 'N/A',
      }));
      
      setClasses(transformedData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (classConfig?: ClassConfiguration) => {
    if (classConfig) {
      setIsEditMode(true);
      setSelectedClass(classConfig);
      setFormData({
        school_id: classConfig.school_id,
        academic_year_id: classConfig.academic_year_id,
        grade: classConfig.grade,
        section: classConfig.section,
        room_number: classConfig.room_number,
        maximum_student_count: classConfig.maximum_student_count,
        number_of_periods: classConfig.number_of_periods,
        is_active: classConfig.is_active,
      });
    } else {
      setIsEditMode(false);
      setSelectedClass(null);
      setFormData({
        school_id: '',
        academic_year_id: '',
        grade: '',
        section: '',
        room_number: '',
        maximum_student_count: 30,
        number_of_periods: 5,
        is_active: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedClass(null);
    setIsEditMode(false);
  };

  const handleSaveClass = async () => {
    try {
      if (!formData.school_id || !formData.academic_year_id || !formData.grade || !formData.section || !formData.room_number) {
        toast.error('Please fill all required fields');
        return;
      }

      setActionLoading(true);

      if (isEditMode && selectedClass) {
        // Update existing class
        const { error } = await supabase
          .from('class_configurations')
          .update({
            school_id: formData.school_id,
            academic_year_id: formData.academic_year_id,
            grade: formData.grade,
            section: formData.section,
            room_number: formData.room_number,
            maximum_student_count: formData.maximum_student_count,
            number_of_periods: formData.number_of_periods,
            is_active: formData.is_active,
          })
          .eq('class_id', selectedClass.class_id);

        if (error) throw error;
        toast.success('Class updated successfully');
      } else {
        // Create new class
        const { error } = await supabase
          .from('class_configurations')
          .insert([{
            school_id: formData.school_id,
            academic_year_id: formData.academic_year_id,
            year_name: `${formData.grade}-${formData.section}`,
            grade: formData.grade,
            section: formData.section,
            room_number: formData.room_number,
            maximum_student_count: formData.maximum_student_count,
            number_of_periods: formData.number_of_periods,
            is_active: formData.is_active,
          }]);

        if (error) throw error;
        toast.success('Class created successfully');
      }

      handleCloseForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving class:', error);
      toast.error(error.message || 'Failed to save class');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (classConfig: ClassConfiguration) => {
    setSelectedClass(classConfig);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClass) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('class_configurations')
        .delete()
        .eq('class_id', selectedClass.class_id);

      if (error) throw error;
      toast.success('Class deleted successfully');
      setIsDeleteOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast.error(error.message || 'Failed to delete class');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage school classes and configurations</p>
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="gap-2"
          size="lg"
        >
          <Plus className="h-4 w-4" />
          Config New Class
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead>Room Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No classes configured yet
                  </TableCell>
                </TableRow>
              ) : (
                classes.map((classConfig) => (
                  <TableRow key={classConfig.class_id}>
                    <TableCell className="font-medium">{classConfig.school_name}</TableCell>
                    <TableCell>{classConfig.academic_year}</TableCell>
                    <TableCell>{classConfig.grade}</TableCell>
                    <TableCell>{classConfig.section}</TableCell>
                    <TableCell>{classConfig.maximum_student_count}</TableCell>
                    <TableCell>{classConfig.room_number}</TableCell>
                    <TableCell>
                      <Badge variant={classConfig.is_active ? 'default' : 'secondary'}>
                        {classConfig.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(classConfig.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(classConfig)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(classConfig)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-full max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Class Configuration' : 'Create New Class Configuration'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the class details below' : 'Fill in the details to create a new class'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* School */}
            <div className="space-y-2">
              <Label htmlFor="school">School *</Label>
              <Select value={formData.school_id} onValueChange={(value) => setFormData({ ...formData, school_id: value })}>
                <SelectTrigger id="school">
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.school_id} value={school.school_id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Academic Year *</Label>
              <Select value={formData.academic_year_id} onValueChange={(value) => setFormData({ ...formData, academic_year_id: value })}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year.academic_year_id} value={year.academic_year_id}>
                      {year.year_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div className="space-y-2">
              <Label htmlFor="grade">Grade *</Label>
              <Input
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="e.g., 1, 2, 5, 10"
              />
            </div>

            {/* Section */}
            <div className="space-y-2">
              <Label htmlFor="section">Section *</Label>
              <Input
                id="section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="e.g., A, B, C"
              />
            </div>

            {/* Room Number */}
            <div className="space-y-2">
              <Label htmlFor="room">Room Number *</Label>
              <Input
                id="room"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g., 101, 202"
              />
            </div>

            {/* Maximum Student Count */}
            <div className="space-y-2">
              <Label htmlFor="max-students">Maximum Student Count</Label>
              <Input
                id="max-students"
                type="number"
                value={formData.maximum_student_count}
                onChange={(e) => setFormData({ ...formData, maximum_student_count: parseInt(e.target.value) || 0 })}
                min="1"
              />
            </div>



            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ACTIVE</SelectItem>
                  <SelectItem value="inactive">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveClass} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the class <strong>{selectedClass?.grade}-{selectedClass?.section}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassConfigurations;
