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
import { UserCheck, UserX, Key, Loader2, RefreshCw } from 'lucide-react';

interface Teacher {
  id: string;
  auth0_user_id: string;
  full_name: string;
  email: string;
  school_name?: string;
  school_id?: string;
  is_active: boolean;
  role: string;
  created_at: string;
  grades_taught?: string[];
  subjects?: string[];
}

const AdminTeachers = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    teacher: Teacher | null;
    action: 'activate' | 'deactivate' | 'reset-password' | null;
  }>({
    open: false,
    teacher: null,
    action: null,
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching teachers with user:', {
        userId: user?.id,
        userRole: user?.role,
        userSchoolId: user?.school_id
      });
      
      // Fetch all teachers (both admin and teacher roles)
      let query = supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by school_id if user has one (optional for now)
      if (user?.school_id) {
        console.log('📍 Filtering by school_id:', user.school_id);
        query = query.eq('school_id', user.school_id);
      }

      const { data, error } = await query;

      console.log('📊 Teachers query result:', { 
        dataCount: data?.length, 
        error: error?.message,
        data: data 
      });

      if (error) {
        console.error('Error fetching teachers:', error);
        toast.error(`Failed to load teachers: ${error.message}`);
        return;
      }

      setTeachers(data || []);
      if (data && data.length > 0) {
        toast.success(`Loaded ${data.length} teacher(s)`);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [user?.school_id]);

  const handleToggleActive = async (teacher: Teacher) => {
    setConfirmDialog({
      open: true,
      teacher,
      action: teacher.is_active ? 'deactivate' : 'activate',
    });
  };

  const confirmToggleActive = async () => {
    const { teacher, action } = confirmDialog;
    if (!teacher) return;

    try {
      setActionLoading(teacher.id);

      const { error } = await supabase
        .from('teachers')
        .update({ is_active: action === 'activate' })
        .eq('id', teacher.id);

      if (error) {
        console.error('Error updating teacher:', error);
        toast.error('Failed to update teacher status');
        return;
      }

      toast.success(
        `Teacher ${action === 'activate' ? 'activated' : 'deactivated'} successfully`
      );

      // Refresh the list
      await fetchTeachers();
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error('Failed to update teacher status');
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, teacher: null, action: null });
    }
  };

  const handleResetPassword = async (teacher: Teacher) => {
    setConfirmDialog({
      open: true,
      teacher,
      action: 'reset-password',
    });
  };

  const confirmResetPassword = async () => {
    const { teacher } = confirmDialog;
    if (!teacher) return;

    try {
      setActionLoading(teacher.id);

      // Call the admin API endpoint to reset password
      const response = await fetch('/api/admin/reset-teacher-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: teacher.id,
          email: teacher.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send password reset');
      }

      toast.success('Password reset email sent successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(
        'Password reset functionality requires backend integration. Please configure Auth0 Management API or Supabase Auth.'
      );
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, teacher: null, action: null });
    }
  };

  const handleConfirm = () => {
    const { action } = confirmDialog;
    if (action === 'reset-password') {
      confirmResetPassword();
    } else {
      confirmToggleActive();
    }
  };

  const getDialogContent = () => {
    const { teacher, action } = confirmDialog;
    if (!teacher) return { title: '', description: '' };

    switch (action) {
      case 'activate':
        return {
          title: 'Activate Teacher',
          description: `Are you sure you want to activate ${teacher.full_name}? They will be able to access the system.`,
        };
      case 'deactivate':
        return {
          title: 'Deactivate Teacher',
          description: `Are you sure you want to deactivate ${teacher.full_name}? They will lose access to the system.`,
        };
      case 'reset-password':
        return {
          title: 'Reset Password',
          description: `Send a password reset email to ${teacher.email}?`,
        };
      default:
        return { title: '', description: '' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dialogContent = getDialogContent();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Teachers</h2>
          <p className="text-gray-600 mt-1">
            Manage teacher accounts and permissions
          </p>
        </div>
        <Button onClick={fetchTeachers} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Grades</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No teachers found
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.full_name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.school_name || '-'}</TableCell>
                  <TableCell>
                    {teacher.grades_taught && teacher.grades_taught.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.grades_taught.map((grade) => (
                          <Badge key={grade} variant="secondary" className="text-xs">
                            {grade}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.slice(0, 2).map((subject) => (
                          <Badge key={subject} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {teacher.subjects.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{teacher.subjects.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={teacher.is_active ? 'default' : 'secondary'}
                      className={
                        teacher.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(teacher)}
                        disabled={actionLoading === teacher.id}
                        className="gap-2"
                      >
                        {teacher.is_active ? (
                          <>
                            <UserX className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(teacher)}
                        disabled={actionLoading === teacher.id}
                        className="gap-2"
                      >
                        <Key className="h-4 w-4" />
                        Reset Password
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, teacher: null, action: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTeachers;
