import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGradeFilter } from '@/contexts/GradeFilterContext';
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
import { chatAPI } from '@/api/chat';
import { DoorOpen, Users, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const RoomsPage = () => {
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();
  const { selectedGrades } = useGradeFilter();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
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
    if (authLoading || !isAuthenticated || !auth0UserId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [auth0UserId, authLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      if (authLoading || !isAuthenticated || !auth0UserId) {
        return;
      }
      setLoading(true);
      const [roomsData, studentsData] = await Promise.all([
        roomsAPI.list(auth0UserId),
        studentsAPI.list(auth0UserId),
      ]);
      setRooms(roomsData);
      console.log('Rooms data:', roomsData);
      setStudents(studentsData);
      // Fetch unread counts for each room in parallel
      try {
        const results = await Promise.all(
          roomsData.map(async (room: any) => {
            const { unread_count } = await chatAPI.getUnreadForTeacher(auth0UserId, room.id);
            return { roomId: room.id, unread: unread_count };
          })
        );
        const mapping: Record<string, number> = {};
        results.forEach(({ roomId, unread }) => { mapping[roomId] = unread || 0; });
        setUnreadCounts(mapping);
      } catch (e) {
        console.warn('Failed to fetch unread counts', e);
      }
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
    // Always use the latest room object from state (in case of stale prop)
    const latestRoom = rooms.find((r) => r.id === room.id) || room;
    setSelectedRoom(latestRoom);
    setSelectedStudents(latestRoom.student_ids ? [...latestRoom.student_ids] : []);
    setShowAssignDialog(true);
  };

  const handleAssignStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    try {
      await roomsAPI.assignStudents(auth0UserId, selectedRoom.id, selectedStudents);
      toast.success('Students assigned successfully');
      // Reload rooms and students, and update selectedRoom and selectedStudents from backend
      const [roomsData, studentsData] = await Promise.all([
        roomsAPI.list(auth0UserId),
        studentsAPI.list(auth0UserId),
      ]);
      setRooms(roomsData);
      setStudents(studentsData);
      // Find the updated room and set as selectedRoom
      const updatedRoom = roomsData.find((r: any) => r.id === selectedRoom.id);
      setSelectedRoom(updatedRoom);
      setSelectedStudents(updatedRoom?.student_ids ? [...updatedRoom.student_ids] : []);
      setShowAssignDialog(false);
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

  // Filter rooms by selected grades from context
  const filteredRooms = useMemo(() => {
    if (selectedGrades.length === 0) {
      return rooms;
    }
    return rooms.filter((room) => selectedGrades.includes(room.grade_level));
  }, [rooms, selectedGrades]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 pt-32">
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
              <h1 className="text-2xl font-bold mb-2">Virtual Rooms</h1>
              <p className="text-sm text-muted-foreground">Organize students into learning groups</p>
            </div>
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
        ) : filteredRooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
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
                      {unreadCounts[room.id] > 0 && (
                        <Badge variant="outline" className="mt-2 ml-2 bg-red-50 text-red-600 border-red-200">
                          Unread {unreadCounts[room.id]}
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/rooms/${room.id}`)}
                        aria-label="Open Room"
                      >
                        <DoorOpen className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignDialog(room)}
                        aria-label="View and manage assigned students"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Assigned Students
                      </Button>
                    </div>
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
              <DialogTitle>Assigned Students in {selectedRoom?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignStudents} className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {students.length > 0 ? (
                  (() => {
                    // Assigned = in selectedStudents, Unassigned = not in selectedStudents
                    const assigned = students.filter(s => selectedStudents.includes(s.id));
                    const unassigned = students.filter(s => !selectedStudents.includes(s.id));

                    return <>
                      {/* Assigned Students Section */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Assigned Students</div>
                        {assigned.length > 0 ? assigned.map(student => (
                          <div
                            key={student.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                          >
                            <Checkbox
                              id={"assigned-" + student.id}
                              checked={true}
                              onCheckedChange={() => toggleStudent(student.id)}
                            />
                            <label
                              htmlFor={"assigned-" + student.id}
                              className="flex-1 cursor-pointer"
                            >
                              {student.name}
                            </label>
                          </div>
                        )) : (
                          <div className="text-muted-foreground text-sm p-3">No students assigned.</div>
                        )}
                      </div>
                      {/* Unassigned Students Section */}
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-1">Available Students</div>
                        {unassigned.length > 0 ? unassigned.map(student => (
                          <div
                            key={student.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                          >
                            <Checkbox
                              id={"unassigned-" + student.id}
                              checked={false}
                              onCheckedChange={() => toggleStudent(student.id)}
                            />
                            <label
                              htmlFor={"unassigned-" + student.id}
                              className="flex-1 cursor-pointer"
                            >
                              {student.name}
                            </label>
                          </div>
                        )) : (
                          <div className="text-muted-foreground text-sm p-3">No available students.</div>
                        )}
                      </div>
                    </>;
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No students available. Add students first.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={students.length === 0}>
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RoomsPage;
