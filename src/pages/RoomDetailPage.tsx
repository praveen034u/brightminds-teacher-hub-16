import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, BookOpen, Sparkles, Brain } from 'lucide-react';
import { roomsAPI, studentsAPI } from '@/api/edgeClient';
import { toast } from 'sonner';

export const RoomDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      setLoading(false);
      return;
    }
    loadRoomDetails();
  }, [roomId, auth0UserId, authLoading, isAuthenticated]);

  const loadRoomDetails = async () => {
    try {
      if (authLoading || !isAuthenticated || !auth0UserId) {
        return;
      }
      setLoading(true);
      const [roomsData, allStudents] = await Promise.all([
        roomsAPI.list(auth0UserId),
        studentsAPI.list(auth0UserId),
      ]);

      const currentRoom = roomsData.find((r: any) => r.id === roomId);
      if (!currentRoom) {
        toast.error('Room not found');
        navigate('/rooms');
        return;
      }

      setRoom(currentRoom);
      // In a real implementation, you'd filter students by room_students table
      // For now, showing all students as a demo
      setStudents(allStudents);
    } catch (error) {
      console.error('Failed to load room details:', error);
      toast.error('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (student: any) => {
    navigate(`/rooms/${roomId}/student/${student.id}`, { state: { student, room } });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-primary text-primary-foreground',
      'bg-secondary text-secondary-foreground',
      'bg-accent text-accent-foreground',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
      'bg-blue-100 text-blue-600',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <Header />
        <div className="container mx-auto px-6 py-8 pt-32">
          <p className="text-center text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(280,40%,98%)] via-[hsl(280,30%,95%)] to-[hsl(35,95%,95%)]">
      <Header />
      
      <main className="container mx-auto px-6 py-8 pt-32">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/rooms')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Button>

        {room && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">{room.name}</h1>
              <p className="text-sm text-muted-foreground">{room.description}</p>
              <Badge variant="secondary" className="mt-2">{room.grade_level}</Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Select a Student</h2>
              <p className="text-muted-foreground mb-6">
                Click on a student to start their learning activity
              </p>
            </div>

            {students.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No students in this room yet</p>
                  <Button onClick={() => navigate('/rooms')}>
                    Assign Students to Room
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {students.map((student, index) => (
                  <Card
                    key={student.id}
                    className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary"
                    onClick={() => handleStudentClick(student)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <Avatar className={`h-24 w-24 mb-4 text-2xl font-bold ${getAvatarColor(index)}`}>
                        <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-foreground text-lg">{student.name}</p>
                      {student.primary_language && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {student.primary_language}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
