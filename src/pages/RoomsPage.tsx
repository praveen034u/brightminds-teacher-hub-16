import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { roomsAPI, studentsAPI } from '@/api/edgeClient';
import { DoorOpen, Users, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export const RoomsPage = () => {
  const { auth0UserId } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grade_level: '',
  });

  useEffect(() => {
    loadData();
  }, [auth0UserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, studentsData] = await Promise.all([
        roomsAPI.list(auth0UserId),
        studentsAPI.list(auth0UserId),
      ]);
      setRooms(roomsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomsAPI.create(auth0UserId, formData);
      toast.success('Room created successfully');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', grade_level: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create room');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await roomsAPI.delete(auth0UserId, id);
      toast.success('Room deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete room');
    }
  };

  const openAssignDialog = (room: any) => {
    setSelectedRoom(room);
    setSelectedStudents([]);
    setShowAssignDialog(true);
  };

  const handleAssignStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    try {
      await roomsAPI.assignStudents(auth0UserId, selectedRoom.id, selectedStudents);
      toast.success('Students assigned successfully');
      setShowAssignDialog(false);
      setSelectedRoom(null);
      setSelectedStudents([]);
      loadData();
    } catch (error) {
      toast.error('Failed to assign students');
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Virtual Rooms</h1>
            <p className="text-muted-foreground">Organize students into learning groups</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <DoorOpen className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <Label htmlFor="name">Room Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade Level</Label>
                  <Input
                    id="grade"
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    placeholder="e.g., 3-5"
                  />
                </div>
                <Button type="submit" className="w-full">Create Room</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{room.name}</CardTitle>
                      {room.grade_level && (
                        <Badge variant="secondary" className="mt-2">
                          Grade {room.grade_level}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {room.description && (
                    <p className="text-sm text-muted-foreground mb-4">{room.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{room.student_count || 0} students</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignDialog(room)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DoorOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No rooms yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first room to organize students
            </p>
          </div>
        )}

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Students to {selectedRoom?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignStudents} className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {students.length > 0 ? (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                      />
                      <label
                        htmlFor={student.id}
                        className="flex-1 cursor-pointer"
                      >
                        {student.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No students available. Add students first.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={students.length === 0}>
                Assign {selectedStudents.length} Student(s)
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RoomsPage;
