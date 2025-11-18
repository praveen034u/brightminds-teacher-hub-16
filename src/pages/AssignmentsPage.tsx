import { useEffect, useState, useRef, useCallback } from 'react';
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
import { assignmentsAPI, roomsAPI, meAPI, teacherProgressAPI } from '@/api/edgeClient';
import { supabase } from '@/config/supabase';
import { getSupabaseUrl } from '@/config/supabase';
import { Calendar, Clock, Users, Plus, Trash2, Edit, FileText, Upload, Archive, Eye, CheckCircle, XCircle, Loader, Gamepad2, User, ArrowLeft, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '@/components/LoadingState';

export const AssignmentsPage = () => {
  const { auth0UserId } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [showAssignmentDetails, setShowAssignmentDetails] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [assignmentProgress, setAssignmentProgress] = useState<any[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignmentToAssign, setAssignmentToAssign] = useState<any>(null);
  const [selectedRoomForAssign, setSelectedRoomForAssign] = useState('');
  
  // Real-time subscription state
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const broadcastChannelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
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

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached for assignment attempts');
      toast.error('Live updates disconnected. Please refresh the page.', { duration: 5000 });
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);

    console.log(`Attempting to reconnect assignment attempts (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      if (subscriptionRef.current && supabase) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Reuse the setupRealtimeSubscription function
      if (!auth0UserId || !supabase) {
        console.log('Cannot setup real-time subscription: missing auth0UserId or supabase');
        return;
      }

      const channelName = `teacher-assignments-${auth0UserId}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignment_attempts'
          },
          (payload) => {
            console.log('🔔 Assignment attempt change detected:', payload);
            
            const attemptData = payload.new || payload.old;
            
            if (attemptData && typeof attemptData === 'object' && 'assignment_id' in attemptData) {
              console.log('📊 Attempt data:', {
                assignmentId: (attemptData as any).assignment_id,
                studentId: (attemptData as any).student_id,
                status: (attemptData as any).status,
                score: (attemptData as any).score,
                event: payload.eventType
              });
              
              if (payload.eventType === 'INSERT' && 'status' in attemptData && attemptData.status === 'in_progress') {
                toast.info(`📝 ${(attemptData as any).student_name || 'A student'} started an assignment`, { duration: 3000 });
              } else if (payload.eventType === 'UPDATE' && 'status' in attemptData && attemptData.status === 'completed') {
                const studentName = (attemptData as any).student_name || 'A student';
                const score = (attemptData as any).score;
                toast.success(`🎉 ${studentName} completed an assignment${score ? ` with ${score}% score` : ''}!`, { duration: 5000 });
                
                // Force immediate data refresh for completed assignments
                console.log('🎯 Assignment completed - forcing immediate refresh...');
                setTimeout(() => {
                  loadData();
                  console.log('🔄 Forced refresh completed for assignment completion');
                }, 500);
              }
              
              console.log('🔄 Auto-refreshing assignments due to attempt change...');
              loadData();
            }
          }
        )
        .subscribe((status, err) => {
          console.log('🔔 Assignment attempts subscription status:', status);
          if (err) console.error('🔔 Subscription error:', err);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to assignment attempts updates!');
            setRealtimeConnected(true);
            reconnectAttemptsRef.current = 0;
            toast.success('📡 Live progress updates enabled', { duration: 2000 });
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Failed to subscribe to assignment attempts');
            setRealtimeConnected(false);
            attemptReconnect();
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️ Assignment attempts subscription timed out');
            setRealtimeConnected(false);
            attemptReconnect();
          } else if (status === 'CLOSED') {
            console.log('🔌 Assignment attempts subscription closed');
            setRealtimeConnected(false);
          }
        });

      if (channel) {
        subscriptionRef.current = channel;
      }
    }, delay);
  }, [auth0UserId]);

  // Setup real-time subscription for assignment attempts
  const setupRealtimeSubscription = useCallback(() => {
    if (!auth0UserId || !supabase) {
      console.log('Cannot setup real-time subscription: missing auth0UserId or supabase');
      return null;
    }

    console.log('🔔 Setting up real-time subscription for assignment attempts...');
    
    const channelName = `teacher-assignments-${auth0UserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_attempts'
        },
        (payload) => {
          console.log('🔔 Assignment attempt change detected:', payload);
          
          // Get the assignment attempt data
          const attemptData = payload.new || payload.old;
          
          if (attemptData && typeof attemptData === 'object' && 'assignment_id' in attemptData) {
            console.log('📊 Attempt data:', {
              assignmentId: (attemptData as any).assignment_id,
              studentId: (attemptData as any).student_id,
              status: (attemptData as any).status,
              score: (attemptData as any).score,
              event: payload.eventType
            });
            
            // Show real-time notification
            if (payload.eventType === 'INSERT' && 'status' in attemptData && attemptData.status === 'in_progress') {
              toast.info('📝 A student started an assignment', { duration: 3000 });
            } else if (payload.eventType === 'UPDATE' && 'status' in attemptData && attemptData.status === 'completed') {
              toast.success('🎉 A student completed an assignment!', { duration: 5000 });
            }
            
            // Auto-refresh assignment data to show updated progress
            console.log('🔄 Auto-refreshing assignments due to attempt change...');
            loadData();
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 Assignment attempts subscription status:', status);
        if (err) console.error('🔔 Subscription error:', err);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to assignment attempts updates!');
          setRealtimeConnected(true);
          reconnectAttemptsRef.current = 0;
          toast.success('📡 Live progress updates enabled', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to assignment attempts');
          setRealtimeConnected(false);
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Assignment attempts subscription timed out');
          setRealtimeConnected(false);
          attemptReconnect();
        } else if (status === 'CLOSED') {
          console.log('🔌 Assignment attempts subscription closed');
          setRealtimeConnected(false);
        }
      });

    return channel;
  }, [auth0UserId, attemptReconnect]);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription
    const channel = setupRealtimeSubscription();
    if (channel) {
      subscriptionRef.current = channel;
    }
    
    // Setup broadcast channel for immediate completion alerts
    let broadcastChannel = null;
    if (supabase) {
      broadcastChannel = supabase
        .channel('assignment-completion-alerts')
        .on(
          'broadcast',
          { event: 'assignment-completed' },
          (payload) => {
            console.log('🎯 Received assignment completion broadcast:', payload);
            const { studentName, assignmentId, score } = payload.payload || {};
            
            if (studentName && assignmentId) {
              toast.success(`🎉 ${studentName} just completed an assignment${score ? ` (${score}%)` : ''}!`, { 
                duration: 6000
              });
              
              // Immediate refresh to show the completion
              setTimeout(() => {
                console.log('🔄 Refreshing from broadcast notification...');
                loadData();
              }, 1000);
            }
          }
        )
        .subscribe();
      
      broadcastChannelRef.current = broadcastChannel;
    }
    
    // Set up auto-refresh as backup for real-time updates
    const refreshInterval = setInterval(() => {
      if (!loading) {
        console.log('🔄 Auto-refreshing assignment progress...');
        loadData();
      }
    }, 60000); // Refresh every 60 seconds (reduced frequency since we have real-time)
    
    return () => {
      clearInterval(refreshInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionRef.current && supabase) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (broadcastChannelRef.current && supabase) {
        supabase.removeChannel(broadcastChannelRef.current);
      }
    };
  }, [auth0UserId, setupRealtimeSubscription]);

  const refreshData = () => {
    console.log('🔄 Manual refresh triggered');
    toast.success('Refreshing assignment progress...');
    loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug: Check if auth0UserId is available
      console.log('🔍 Loading data for auth0UserId:', auth0UserId);
      
      if (!auth0UserId) {
        console.warn('❌ No auth0UserId available');
        toast.error('Authentication error: Please log in again');
        return;
      }
      
      // First, ensure teacher is registered in database
      console.log('👨‍🏫 Initializing teacher profile...');
      try {
        const teacherProfile = await meAPI.get(auth0UserId);
        console.log('👨‍🏫 Teacher profile:', teacherProfile);
      } catch (error) {
        console.error('❌ Failed to initialize teacher profile:', error);
        toast.error('Failed to initialize your profile. Please try again.');
        setLoading(false);
        return;
      }
      
      let assignmentsData, roomsData;
      
      try {
        [assignmentsData, roomsData] = await Promise.all([
          assignmentsAPI.list(auth0UserId),
          roomsAPI.list(auth0UserId),
        ]);
        
        console.log('📋 Real API data received:', {
          assignments: assignmentsData?.length || 0,
          rooms: roomsData?.length || 0,
          auth0UserId,
          assignmentsArray: assignmentsData,
          roomsArray: roomsData
        });
      } catch (apiError) {
        console.error('❌ Failed to load data from backend:', apiError);
        toast.error('Failed to load assignments. Please check your connection.');
        setLoading(false);
        return;
      }
      
      // Get real-time progress data from teacher-progress API
      let assignmentsWithProgress;
      try {
        const progressData = await teacherProgressAPI.getOverview(auth0UserId);
        console.log('📊 Progress data received:', progressData);
        
        // Match progress data with assignments
        assignmentsWithProgress = assignmentsData.map((assignment: any) => {
          const progress = progressData.find((p: any) => p.id === assignment.id);
          if (progress) {
            return {
              ...assignment,
              totalStudents: progress.total_students,
              completedStudents: progress.completed,
              inProgressStudents: progress.in_progress,
              notStartedStudents: progress.not_started,
              averageScore: Math.round(progress.average_score)
            };
          } else {
            // Fallback if no progress data available
            return {
              ...assignment,
              totalStudents: 0,
              completedStudents: 0,
              inProgressStudents: 0,
              notStartedStudents: 0,
              averageScore: 0
            };
          }
        });
      } catch (progressError) {
        console.warn('⚠️ Failed to load progress data, using basic assignment data:', progressError);
        // Use assignments without progress data as fallback
        assignmentsWithProgress = assignmentsData.map((assignment: any) => ({
          ...assignment,
          totalStudents: 0,
          completedStudents: 0,
          inProgressStudents: 0,
          notStartedStudents: 0,
          averageScore: 0
        }));
      }
      
      setAssignments(assignmentsWithProgress);
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

  const handleAssignToRoom = async () => {
    if (!assignmentToAssign || !selectedRoomForAssign) {
      toast.error('Please select a room');
      return;
    }

    try {
      // Update the assignment to be assigned to the selected room
      await assignmentsAPI.update(auth0UserId, assignmentToAssign.id, {
        room_id: selectedRoomForAssign
      });
      
      toast.success('Assignment successfully assigned to room!');
      setShowAssignDialog(false);
      setAssignmentToAssign(null);
      setSelectedRoomForAssign('');
      loadData(); // Refresh the data
    } catch (error) {
      console.error('Failed to assign assignment:', error);
      toast.error('Failed to assign assignment to room');
    }
  };

  const openAssignDialog = (assignment: any) => {
    setAssignmentToAssign(assignment);
    setSelectedRoomForAssign('');
    setShowAssignDialog(true);
  };

  const handleViewAssignmentDetails = async (assignment: any) => {
    try {
      console.log('📊 Loading assignment details for:', assignment.id, assignment.title);
      setSelectedAssignment(assignment);
      setShowAssignmentDetails(true);
      setAssignmentProgress([]); // Reset progress data
      
      // Use the teacher-progress API to get comprehensive data
      const supabaseUrl = getSupabaseUrl();
      
      console.log('🔍 Fetching detailed progress data...');
      const progressResponse = await fetch(
        `${supabaseUrl}/functions/v1/teacher-progress?auth0_user_id=${auth0UserId}&assignment_id=${assignment.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (progressResponse.ok) {
        const progressResult = await progressResponse.json();
        console.log('📊 Progress API response:', progressResult);
        
        if (progressResult.progress && Array.isArray(progressResult.progress)) {
          const progressData = progressResult.progress.map((student: any) => ({
            id: student.student_id,
            student_name: student.student_name,
            student_email: student.student_email || 'No email',
            status: student.status,
            attempts: student.status === 'not_started' ? 0 : 1,
            score: student.score,
            started_at: student.started_at,
            completed_at: student.completed_at,
          }));
          
          console.log('✅ Processed progress data:', progressData);
          setAssignmentProgress(progressData);
        } else {
          console.warn('⚠️ No progress array in response');
          // Fallback: try to get students directly
          await loadStudentsDirectly(assignment);
        }
      } else {
        console.error('❌ Progress API failed, status:', progressResponse.status);
        const errorText = await progressResponse.text();
        console.error('❌ Progress API error:', errorText);
        
        // Fallback: try to get students directly
        await loadStudentsDirectly(assignment);
      }
    } catch (error) {
      console.error('❌ Error loading assignment details:', error);
      toast.error('Failed to load assignment details');
      
      // Last fallback
      await loadStudentsDirectly(assignment);
    }
  };
  
  const loadStudentsDirectly = async (assignment: any) => {
    try {
      console.log('🔄 Fallback: Loading students directly...');
      const supabaseUrl = getSupabaseUrl();
      
      // Fetch students directly
      const studentsResponse = await fetch(
        `${supabaseUrl}/functions/v1/students?auth0_user_id=${auth0UserId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        console.log('👥 Students data:', students);
        
        // Fetch assignment attempts using Supabase client
        console.log('📝 Fetching assignment attempts for assignment:', assignment.id);
        const { data: attempts, error: attemptsError } = await supabase
          .from('assignment_attempts')
          .select('*')
          .eq('assignment_id', assignment.id);
        
        console.log('📝 Assignment attempts data:', attempts);
        console.log('📝 Assignment attempts error:', attemptsError);
        
        if (attemptsError) {
          console.warn('⚠️ Error fetching assignment attempts:', attemptsError);
        }
        
        // Create progress data for each student
        const progressData = students.map((student: any) => {
          const attempt = attempts?.find(a => a.student_id === student.id);
          
          console.log(`🎯 Student ${student.name} (${student.id}):`, {
            hasAttempt: !!attempt,
            attemptStatus: attempt?.status,
            attemptScore: attempt?.score,
            attemptCount: attempt?.attempts_count
          });
          
          return {
            id: student.id,
            student_name: student.name,
            student_email: student.email || 'No email',
            status: attempt?.status || 'not_started',
            attempts: attempt?.attempts_count || 0,
            score: attempt?.score || null,
            started_at: attempt?.started_at || null,
            completed_at: attempt?.completed_at || null,
          };
        });
        
        console.log('✅ Final progress data:', progressData);
        setAssignmentProgress(progressData);
      } else {
        console.error('❌ Failed to fetch students');
        toast.error('No students found for this teacher');
      }
    } catch (error) {
      console.error('❌ Error in loadStudentsDirectly:', error);
      toast.error('Failed to load student data');
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">Assignments</h1>
              <p className="text-muted-foreground">Create and manage student assignments</p>
              {/* Debug info for authentication troubleshooting */}
              {auth0UserId && (
                <p className="text-xs text-blue-600 mt-1">
                  ✅ Authenticated as: {auth0UserId.slice(-8)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              {realtimeConnected ? (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Updates</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={refreshData}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
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
          <LoadingState type="assignments" count={6} />
        ) : filteredAssignments.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="group hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          {assignment.assignment_type === 'game' ? (
                            <Gamepad2 className="h-5 w-5 text-white" />
                          ) : (
                            <FileText className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                            {assignment.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge 
                              variant={assignment.status === 'active' ? 'default' : 'secondary'}
                              className={assignment.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                            >
                              {assignment.status}
                            </Badge>
                            {assignment.rooms?.name && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {assignment.rooms.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignDialog(assignment)}
                        title="Assign to Room"
                        className="hover:bg-green-50 hover:text-green-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAssignmentDetails(assignment)}
                        title="View student progress"
                        className="hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {assignment.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveAssignment(assignment.id)}
                          className="hover:bg-yellow-50 hover:text-yellow-700"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {assignment.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm text-gray-700 leading-relaxed">{assignment.description}</p>
                    </div>
                  )}
                  
                  {/* Quick Progress Overview */}
                  {assignment.totalStudents > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-800">Student Progress</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs hover:bg-white hover:shadow-sm"
                          onClick={() => handleViewAssignmentDetails(assignment)}
                        >
                          View Details
                        </Button>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-white rounded-full h-3 relative overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full transition-all duration-500 shadow-sm" 
                            style={{
                              width: `${assignment.totalStudents > 0 ? (assignment.completedStudents / assignment.totalStudents) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 min-w-[70px]">
                          {assignment.completedStudents}/{assignment.totalStudents} done
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1 p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-green-700 font-medium">{assignment.completedStudents}</span>
                        </div>
                        <div className="flex items-center gap-1 p-2 bg-yellow-100 rounded-lg">
                          <Clock className="h-3 w-3 text-yellow-600" />
                          <span className="text-yellow-700 font-medium">{assignment.inProgressStudents}</span>
                        </div>
                        <div className="flex items-center gap-1 p-2 bg-gray-100 rounded-lg">
                          <User className="h-3 w-3 text-gray-600" />
                          <span className="text-gray-700 font-medium">{assignment.notStartedStudents}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {assignment.totalStudents === 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-amber-800">Track student progress</p>
                            <p className="text-xs text-amber-600">Monitor assignment completion</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAssignmentDetails(assignment)}
                          className="text-xs px-4 py-2 h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  )}

                  {assignment.due_date && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-red-600" />
                        </div>
                        <span className="font-medium">
                          Due: {new Date(assignment.due_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                      {assignment.averageScore > 0 && (
                        <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <span className="font-medium">Avg: {assignment.averageScore}%</span>
                        </div>
                      )}
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

      {/* Assignment Details Modal */}
      <Dialog open={showAssignmentDetails} onOpenChange={setShowAssignmentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              {selectedAssignment?.title} - Student Progress
            </DialogTitle>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="space-y-6">
              {/* Assignment Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Assignment Details</h3>
                    <p className="text-sm text-blue-800">{selectedAssignment.description}</p>
                    {selectedAssignment.due_date && (
                      <div className="flex items-center gap-2 text-sm text-blue-700 mt-2">
                        <Calendar className="h-4 w-4" />
                        Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Progress Overview</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-green-100 rounded">
                        <div className="text-lg font-bold text-green-800">
                          {assignmentProgress.filter(p => p.status === 'completed').length}
                        </div>
                        <div className="text-xs text-green-700">Completed</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 rounded">
                        <div className="text-lg font-bold text-yellow-800">
                          {assignmentProgress.filter(p => p.status === 'in_progress').length}
                        </div>
                        <div className="text-xs text-yellow-700">In Progress</div>
                      </div>
                      <div className="text-center p-2 bg-gray-100 rounded">
                        <div className="text-lg font-bold text-gray-800">
                          {assignmentProgress.filter(p => p.status === 'not_started').length}
                        </div>
                        <div className="text-xs text-gray-700">Not Started</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Progress Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Student Progress</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                      <div className="col-span-2">Student</div>
                      <div>Status</div>
                      <div>Score</div>
                      <div>Attempts</div>
                      <div>Last Activity</div>
                    </div>
                  </div>
                  <div className="divide-y">
                    {assignmentProgress.map((student) => (
                      <div key={student.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="grid grid-cols-6 gap-4 items-center">
                          <div className="col-span-2">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {student.student_name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-sm">{student.student_name}</div>
                                <div className="text-xs text-gray-500">{student.student_email}</div>
                              </div>
                            </div>
                          </div>
                          <div>
                            {student.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            {student.status === 'in_progress' && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <Loader className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                            {student.status === 'not_started' && (
                              <Badge variant="outline" className="text-gray-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Started
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm">
                            {student.score ? `${student.score}%` : '-'}
                          </div>
                          <div className="text-sm">
                            {student.attempts || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.completed_at && 
                              `Completed ${new Date(student.completed_at).toLocaleDateString()}`
                            }
                            {student.started_at && !student.completed_at &&
                              `Started ${new Date(student.started_at).toLocaleDateString()}`
                            }
                            {!student.started_at && !student.completed_at && '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAssignmentDetails(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => selectedAssignment && handleViewAssignmentDetails(selectedAssignment)}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Progress
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Debug function to check assignment attempts
                      if (!selectedAssignment) return;
                      console.log('🔍 Debugging assignment attempts for:', selectedAssignment.id);
                      
                      try {
                        // Direct query to assignment_attempts table
                        const { data: allAttempts, error } = await supabase
                          .from('assignment_attempts')
                          .select('*')
                          .eq('assignment_id', selectedAssignment.id);
                        
                        console.log('📊 All attempts for assignment:', allAttempts);
                        console.log('❌ Query error:', error);
                        
                        // Show results in toast
                        if (allAttempts && allAttempts.length > 0) {
                          toast.success(`Found ${allAttempts.length} assignment attempts in database`);
                          console.log('📋 Attempt details:');
                          allAttempts.forEach(attempt => {
                            console.log(`  Student ${attempt.student_id}: ${attempt.status}, Score: ${attempt.score}`);
                          });
                        } else {
                          toast.warning('No assignment attempts found in database');
                        }
                        
                      } catch (error) {
                        console.error('Debug error:', error);
                        toast.error('Debug query failed');
                      }
                    }}
                    className="text-xs"
                  >
                    🐛 Debug DB
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Create sample assignment attempts for testing
                      if (!selectedAssignment || !auth0UserId) return;
                      
                      console.log('🧪 Creating sample assignment attempts...');
                      
                      try {
                        // Get students for this teacher first
                        const supabaseUrl = getSupabaseUrl();
                        const studentsResponse = await fetch(
                          `${supabaseUrl}/functions/v1/students?auth0_user_id=${auth0UserId}`,
                          {
                            headers: {
                              'Content-Type': 'application/json',
                            },
                          }
                        );
                        
                        if (!studentsResponse.ok) {
                          throw new Error('Failed to fetch students');
                        }
                        
                        const students = await studentsResponse.json();
                        console.log('👥 Found students:', students);
                        
                        if (students.length === 0) {
                          toast.warning('No students found to create sample attempts');
                          return;
                        }
                        
                        // Create sample attempts for students
                        const sampleAttempts = students.slice(0, 3).map((student: any, index: number) => ({
                          assignment_id: selectedAssignment.id,
                          student_id: student.id,
                          status: ['completed', 'in_progress', 'completed'][index],
                          attempts_count: [2, 1, 1][index],
                          score: [85, null, 92][index],
                          max_score: [85, null, 92][index],
                          started_at: new Date(Date.now() - (24 * 60 * 60 * 1000) * (index + 1)).toISOString(),
                          completed_at: index !== 1 ? new Date(Date.now() - (12 * 60 * 60 * 1000) * (index + 1)).toISOString() : null,
                          submission_data: { sampleData: true }
                        }));
                        
                        console.log('📝 Creating sample attempts:', sampleAttempts);
                        
                        const { data: insertedAttempts, error: insertError } = await supabase
                          .from('assignment_attempts')
                          .upsert(sampleAttempts, { onConflict: 'assignment_id,student_id' })
                          .select();
                        
                        if (insertError) {
                          console.error('Insert error:', insertError);
                          toast.error('Failed to create sample attempts: ' + insertError.message);
                        } else {
                          console.log('✅ Sample attempts created:', insertedAttempts);
                          toast.success(`Created ${insertedAttempts?.length || 0} sample assignment attempts`);
                          
                          // Refresh the assignment details
                          handleViewAssignmentDetails(selectedAssignment);
                        }
                        
                      } catch (error) {
                        console.error('Sample creation error:', error);
                        toast.error('Failed to create sample attempts');
                      }
                    }}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200"
                  >
                    🧪 Create Test Data
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    📊 Export Progress
                  </Button>
                  <Button>
                    📧 Send Reminders
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Assignment to Room Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Assign Assignment to Room
            </DialogTitle>
          </DialogHeader>
          
          {assignmentToAssign && (
            <div className="space-y-4">
              {/* Assignment Info */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900">{assignmentToAssign.title}</h3>
                <p className="text-sm text-blue-700 mt-1">{assignmentToAssign.description}</p>
                {assignmentToAssign.rooms?.name && (
                  <p className="text-xs text-blue-600 mt-2">
                    Currently assigned to: <span className="font-medium">{assignmentToAssign.rooms.name}</span>
                  </p>
                )}
              </div>

              {/* Room Selection */}
              <div className="space-y-2">
                <Label htmlFor="assignRoom">Select Room to Assign To</Label>
                <Select value={selectedRoomForAssign} onValueChange={setSelectedRoomForAssign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a room..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.filter(room => room.id !== assignmentToAssign.room_id).map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{room.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {room.student_count || 0} students
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rooms.filter(room => room.id !== assignmentToAssign.room_id).length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No other rooms available. Create more rooms to assign this assignment to different groups.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignToRoom}
                  disabled={!selectedRoomForAssign}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Room
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentsPage;

