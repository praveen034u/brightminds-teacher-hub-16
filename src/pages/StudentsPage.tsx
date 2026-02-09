import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGradeFilter } from '@/contexts/GradeFilterContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { studentsAPI } from '@/api/edgeClient';
import { UserPlus, Copy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const StudentsPage = () => {
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();
  const { selectedGrades } = useGradeFilter();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      setLoading(false);
      return;
    }
    loadStudents();
  }, [auth0UserId, authLoading, isAuthenticated]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrades]);

  const loadStudents = async (page = currentPage) => {
    try {
      if (authLoading || !isAuthenticated || !auth0UserId) {
        return;
      }
      setLoading(true);
      const gradeFilter = selectedGrades.length > 0 ? selectedGrades.join(',') : undefined;
      const response = await studentsAPI.listPaged(auth0UserId, {
        page,
        pageSize,
        grade: gradeFilter,
      });
      setStudents(response.data || []);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      return;
    }
    loadStudents(currentPage);
  }, [currentPage, selectedGrades, auth0UserId, authLoading, isAuthenticated]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));


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
          <div className="text-sm text-muted-foreground">
            Students are managed by administrators. You'll see students assigned to your grades.
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              All Students ({totalCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : students.length > 0 ? (
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
                    <TableHead className="text-right">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">No students assigned yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Admins will onboard students and assign grades to your class
                </p>
              </div>
            )}
          </CardContent>
          {students.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
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
        </Card>
      </main>
    </div>
  );
};

export default StudentsPage;
