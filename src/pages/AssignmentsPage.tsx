import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignmentsAPI, roomsAPI } from '@/api/edgeClient';
import { FileText, Calendar, Trash2, Archive } from 'lucide-react';
import { toast } from 'sonner';

export const AssignmentsPage = () => {
  const { auth0UserId } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    room_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, [auth0UserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, roomsData] = await Promise.all([
        assignmentsAPI.list(auth0UserId),
        roomsAPI.list(auth0UserId),
      ]);
      setAssignments(assignmentsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentsAPI.create(auth0UserId, formData);
      toast.success('Assignment created successfully');
      setShowCreateDialog(false);
      setFormData({
        room_id: '',
        title: '',
        description: '',
        due_date: '',
        status: 'active',
      });
      loadData();
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      await assignmentsAPI.delete(auth0UserId, id);
      toast.success('Assignment deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete assignment');
    }
  };

  const handleArchiveAssignment = async (id: string) => {
    try {
      await assignmentsAPI.update(auth0UserId, id, { status: 'archived' });
      toast.success('Assignment archived');
      loadData();
    } catch (error) {
      toast.error('Failed to archive assignment');
    }
  };

  const filteredAssignments = selectedRoomFilter === 'all'
    ? assignments
    : assignments.filter((a) => a.room_id === selectedRoomFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Assignments</h1>
            <p className="text-muted-foreground">Create and manage student assignments</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <Label htmlFor="room">Room *</Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={rooms.length === 0}>
                  {rooms.length === 0 ? 'Create a room first' : 'Create Assignment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Label>Filter by Room</Label>
          <Select value={selectedRoomFilter} onValueChange={setSelectedRoomFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{assignment.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                        <Badge variant="outline">{assignment.rooms?.name}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {assignment.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveAssignment(assignment.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground mb-4">{assignment.description}</p>
                  )}
                  {assignment.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No assignments yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              {rooms.length === 0
                ? 'Create a room first, then add assignments'
                : 'Create your first assignment to engage students'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignmentsPage;
