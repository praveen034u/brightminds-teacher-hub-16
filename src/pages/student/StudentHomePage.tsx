import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, HelpCircle, LogOut, User, DoorOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  studentAuthAPI,
  getStudentSession,
  clearStudentSession,
  getStudentPublicId,
} from '@/api/studentAuthApi';

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  grade: string;
  studentPublicId: string;
}

interface Room {
  id: string;
  name: string;
}

const StudentHomePage = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStudentSession();
    if (!token) {
      navigate('/student');
      return;
    }

    loadSession(token);
  }, [navigate]);

  const loadSession = async (token: string) => {
    try {
      const result = await studentAuthAPI.getSession(token);
      setStudent(result.student);
      setRooms(result.rooms || []);
    } catch {
      toast.error('Session expired. Please log in again.');
      clearStudentSession();
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStudentSession();
    toast.success('Logged out successfully');
    navigate('/student');
  };

  const handleJoinRoom = (roomId: string) => {
    // Navigate to existing student portal with session
    const token = getStudentSession();
    if (token) {
      toast.info('Joining room...');
      // Could navigate to a room-specific view
    }
  };

  const handleRequestHelp = () => {
    toast.info('Help request feature coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brightminds-logo1.png" alt="BrightMinds" className="h-10 w-10 rounded-xl" />
            <div>
              <h1 className="font-bold text-foreground text-lg">BrightMinds</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <User className="h-3 w-3 mr-1" />
              {student.studentPublicId}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Welcome Card */}
        <Card className="rounded-3xl border-2 border-primary/20 shadow-lg mb-6 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/20 to-secondary/20 pb-6">
            <CardTitle className="text-2xl">
              Hi, {student.name?.split(' ')[0]}! 🌟
            </CardTitle>
            <p className="text-muted-foreground">
              {student.grade && <span>Grade {student.grade} • </span>}
              Ready to learn something new today?
            </p>
          </CardHeader>
        </Card>

        {/* Rooms */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Your Rooms
          </h2>
          {rooms.length > 0 ? (
            <div className="grid gap-3">
              {rooms.map((room) => (
                <Card key={room.id} className="rounded-2xl border-2 border-muted hover:border-primary/30 transition-colors">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <DoorOpen className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{room.name}</span>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleJoinRoom(room.id)}
                    >
                      Join
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed border-2 border-muted">
              <CardContent className="p-6 text-center text-muted-foreground">
                No rooms assigned yet. Your teacher will add you to a room.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-16 rounded-2xl border-2 text-base font-medium hover:border-primary/30 hover:bg-primary/5"
              onClick={handleRequestHelp}
            >
              <HelpCircle className="h-5 w-5 mr-2 text-secondary" />
              Request Help
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentHomePage;
