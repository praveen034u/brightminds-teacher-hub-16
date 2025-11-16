import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { supabase } from '@/config/supabase';
import { Calendar, Clock, Users, Plus, Trash2, Edit, FileText, Upload, Archive } from 'lucide-react';
import { toast } from 'sonner';

export const AssignmentsPage = () => {
  const { auth0UserId } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [roomType, setRoomType] = useState<'prebuilt' | 'custom'>('prebuilt');
  const [selectedPrebuiltRoom, setSelectedPrebuiltRoom] = useState('');
  
  // Game configuration state
  const [selectedGameConfig, setSelectedGameConfig] = useState({
    difficulty: 'easy',
    category: ''
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

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
      
      // Fetch games from Supabase with enhanced data
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('id, name, description, game_type, categories, difficulty_levels, skills')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching games:', error);
        toast.error('Failed to load games');
      } else {
        setGames(gamesData || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const assignmentData = {
        roomType: roomType,
        roomValue: roomType === 'prebuilt' ? selectedPrebuiltRoom : '',
        gameConfig: roomType === 'prebuilt' ? selectedGameConfig : null,
        title,
        description,
        dueDate,
        status: 'active',
      };

      console.log('Creating assignment with data:', assignmentData);
      console.log('Auth0 User ID:', auth0UserId);

      await assignmentsAPI.create(auth0UserId, assignmentData);
      toast.success('Assignment created successfully');
      setShowCreateDialog(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setRoomType('prebuilt');
      setSelectedPrebuiltRoom('');
      setSelectedGameConfig({ difficulty: 'easy', category: '' });
      setAvailableCategories([]);
      
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };



  const validateForm = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    if (!dueDate) {
      toast.error('Please select a due date');
      return false;
    }
    if (roomType === 'prebuilt' && !selectedPrebuiltRoom) {
      toast.error('Please select a game');
      return false;
    }
    if (roomType === 'prebuilt' && selectedPrebuiltRoom) {
      const selectedGame = games.find(g => g.id === selectedPrebuiltRoom);
      if (selectedGame?.categories && selectedGame.categories.length > 0 && !selectedGameConfig.category) {
        toast.error('Please select a category for this game');
        return false;
      }
    }
    return true;
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                {/* Room Type Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Assignment Type *</Label>
                  <Tabs value={roomType} onValueChange={(value: 'prebuilt' | 'custom') => setRoomType(value)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="prebuilt" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Pre-built 
                      </TabsTrigger>
                      <TabsTrigger value="custom" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Custom Rooms
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="prebuilt" className="mt-3">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="prebuilt-room" className="text-sm font-medium">Select Activity</Label>
                          <Select 
                            value={selectedPrebuiltRoom} 
                            onValueChange={(value) => {
                              setSelectedPrebuiltRoom(value);
                              // Find selected game and update available categories
                              const selectedGame = games.find(g => g.id === value);
                              if (selectedGame) {
                                setAvailableCategories(selectedGame.categories || []);
                                // Reset category when game changes
                                setSelectedGameConfig(prev => ({ 
                                  ...prev, 
                                  category: selectedGame.categories?.[0] || '' 
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-auto min-h-[50px]">
                              <SelectValue placeholder="Choose a game for your students...">
                                {selectedPrebuiltRoom && (
                                  <div className="flex items-start gap-3 p-2">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-bold text-lg">🎮</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium">{games.find(g => g.id === selectedPrebuiltRoom)?.name}</div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {games.find(g => g.id === selectedPrebuiltRoom)?.description}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                              {games.map((game) => (
                                <SelectItem key={game.id} value={game.id} className="p-0">
                                  <div className="flex items-start gap-3 p-3 w-full hover:bg-gray-50">
                                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-bold text-lg">
                                        {game.game_type === 'word-scramble' && '🔤'}
                                        {game.game_type === 'emoji-guess' && '🎯'}
                                        {game.game_type === 'riddle' && '🧩'}
                                        {game.game_type === 'crossword' && '📝'}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm">{game.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {game.description}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {game.skills?.slice(0, 3).map((skill: string) => (
                                          <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
                                            {skill}
                                          </Badge>
                                        ))}
                                        {game.skills && game.skills.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{game.skills.length - 3} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Game Configuration Panel */}
                        {selectedPrebuiltRoom && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-xs">⚙️</span>
                              </div>
                              <h4 className="font-medium text-blue-900 text-sm">Game Configuration</h4>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-3">
                              {/* Difficulty Selection */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-blue-800">Difficulty Level</Label>
                                <Select 
                                  value={selectedGameConfig.difficulty} 
                                  onValueChange={(value) => setSelectedGameConfig(prev => ({ ...prev, difficulty: value }))}
                                >
                                  <SelectTrigger className="bg-white border-blue-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="easy" className="flex items-center gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                        <span>Easy - Perfect for beginners</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="medium" className="flex items-center gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                        <span>Medium - Good challenge</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="hard" className="flex items-center gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                        <span>Hard - Expert level</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Category Selection (if game has categories) */}
                              {availableCategories.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-blue-800">Category/Theme</Label>
                                  <Select 
                                    value={selectedGameConfig.category} 
                                    onValueChange={(value) => setSelectedGameConfig(prev => ({ ...prev, category: value }))}
                                  >
                                    <SelectTrigger className="bg-white border-blue-200">
                                      <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableCategories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                          <div className="flex items-center gap-2">
                                            <span>🏷️</span>
                                            <span>{category}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Enhanced Preview */}
                            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                              <div className="flex items-start gap-2">
                                <div className="h-8 w-8 rounded bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-white text-sm">👀</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-900 mb-1">Student Experience Preview</div>
                                  <div className="text-xs text-gray-600">
                                    Students will play: <strong className="text-blue-600">{games.find(g => g.id === selectedPrebuiltRoom)?.name}</strong>
                                    {selectedGameConfig.category && (
                                      <span> with <strong className="text-purple-600">{selectedGameConfig.category}</strong> theme</span>
                                    )}
                                    <span> at <strong className="text-green-600">{selectedGameConfig.difficulty}</strong> difficulty level</span>
                                  </div>
                                  <div className="flex gap-1 mt-2">
                                    <Badge variant={selectedGameConfig.difficulty === 'easy' ? 'default' : 'outline'} className="text-xs">
                                      🟢 {selectedGameConfig.difficulty === 'easy' ? 'Active: ' : ''}Easy
                                    </Badge>
                                    <Badge variant={selectedGameConfig.difficulty === 'medium' ? 'default' : 'outline'} className="text-xs">
                                      🟡 {selectedGameConfig.difficulty === 'medium' ? 'Active: ' : ''}Medium
                                    </Badge>
                                    <Badge variant={selectedGameConfig.difficulty === 'hard' ? 'default' : 'outline'} className="text-xs">
                                      🔴 {selectedGameConfig.difficulty === 'hard' ? 'Active: ' : ''}Hard
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="custom" className="mt-4">
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                          <div className="space-y-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mx-auto">
                              <FileText className="h-8 w-8 text-white" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-gray-800">Custom Room Coming Soon</h3>
                              <p className="text-sm text-gray-600 max-w-md mx-auto">
                                Upload your own custom content and create personalized learning experiences for your students.
                              </p>
                            </div>
                            <div className="flex justify-center gap-2">
                              <Badge variant="outline" className="text-xs">📁 File Upload</Badge>
                              <Badge variant="outline" className="text-xs">🎨 Custom Content</Badge>
                              <Badge variant="outline" className="text-xs">📚 Your Materials</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-sm">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter assignment title..."
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the assignment objectives and instructions..."
                    className="w-full min-h-[60px] text-sm"
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <Label htmlFor="dueDate" className="text-sm">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Assignment
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
