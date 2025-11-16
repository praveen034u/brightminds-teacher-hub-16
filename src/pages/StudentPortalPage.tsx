import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Calendar, Clock, User, Home, HelpCircle, Bell, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';

interface StudentData {
  id: string;
  name: string;
  email: string;
  primary_language: string;
  rooms: Array<{
    id: string;
    name: string;
    description: string;
    grade_level: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    description: string;
    due_date: string;
    status: string;
    room_id: string;
  }>;
  classmates: Array<{
    id: string;
    name: string;
    email: string;
    primary_language: string;
    rooms: Array<{
      id: string;
      name: string;
      description: string;
      grade_level: string;
    }>;
    shared_room_count: number;
  }>;
}

export const StudentPortalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const subscriptionRef = useRef<any>(null);
  const studentDataRef = useRef<StudentData | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Keep studentDataRef in sync with studentData
  useEffect(() => {
    studentDataRef.current = studentData;
  }, [studentData]);

  // Load student data function (defined early for use in effects)
  const loadStudentData = useCallback(async (accessToken: string) => {
    try {
      setLoading(true);
      
      // Enable mock data for testing when function is not deployed
      // Remove this block once the Supabase function is deployed
      const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true' || accessToken === 'demo';
      
      if (useMockData) {
        console.log('Using mock data for testing');
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: StudentData = {
          id: 'mock-student-1',
          name: 'Demo Student',
          email: 'demo.student@example.com',
          primary_language: 'English',
          rooms: [
            {
              id: 'mock-room-1',
              name: 'Mathematics 101',
              description: 'Introduction to Algebra',
              grade_level: '9'
            },
            {
              id: 'mock-room-2',
              name: 'English Literature',
              description: 'Classic Literature Studies',
              grade_level: '9'
            }
          ],
          assignments: [
            {
              id: 'mock-assignment-1',
              title: 'Algebra Homework',
              description: 'Complete exercises 1-15 on page 42',
              due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
              status: 'active',
              room_id: 'mock-room-1'
            },
            {
              id: 'mock-assignment-2',
              title: 'Essay: Romeo and Juliet',
              description: 'Write a 500-word essay about the themes in Romeo and Juliet',
              due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
              status: 'active',
              room_id: 'mock-room-2'
            }
          ],
          classmates: [
            {
              id: 'mock-student-2',
              name: 'Alice Johnson',
              email: 'alice.j@example.com',
              primary_language: 'English',
              rooms: [
                {
                  id: 'mock-room-1',
                  name: 'Mathematics 101',
                  description: 'Introduction to Algebra',
                  grade_level: '9'
                }
              ],
              shared_room_count: 1
            },
            {
              id: 'mock-student-3',
              name: 'Bob Smith',
              email: 'bob.s@example.com',
              primary_language: 'Spanish',
              rooms: [
                {
                  id: 'mock-room-2',
                  name: 'English Literature',
                  description: 'Classic Literature Studies',
                  grade_level: '9'
                }
              ],
              shared_room_count: 1
            }
          ]
        };
        
        setStudentData(mockData);
        setError(null);
        toast.success('Loaded demo data successfully');
        return;
      }

      const supabaseUrl = getSupabaseUrl();
      console.log('Attempting to fetch student data from:', `${supabaseUrl}/functions/v1/student-portal?token=${accessToken}`);
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/student-portal?token=${accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Check if response is HTML (error page) vs JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const htmlText = await response.text();
          console.error('HTML response received:', htmlText.substring(0, 500));
          throw new Error(`Server error (${response.status}): The student-portal function appears to be unavailable. Try using token "demo" for testing, or ensure the function is deployed to Supabase.`);
        }
        
        // Try to get error message from JSON response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`Server error: ${response.status} - ${response.statusText}`);
        }
      }

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 500));
        throw new Error('Server returned invalid response format. The student-portal function may not be properly deployed. Try using token "demo" for testing.');
      }

      const data = await response.json();
      console.log('Successfully loaded student data:', data);
      setStudentData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load student data:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load student data';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error: Cannot connect to the server. Please check your internet connection.';
      } else if (err instanceof SyntaxError && err.message.includes('JSON')) {
        errorMessage = 'Server configuration error: The student-portal function is not properly set up. Try using token "demo" for testing.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - function is stable


  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabasePublishableKey();
    
    console.log('Initializing Supabase client...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');
    
    supabaseRef.current = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    console.log('✅ Supabase client initialized');
    
    // Test Realtime connection
    console.log('Testing Realtime connection...');
    const testChannel = supabaseRef.current.channel('connection-test');
    testChannel.subscribe((status) => {
      console.log('Test channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime is working! Unsubscribing test channel...');
        supabaseRef.current?.removeChannel(testChannel);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime connection test failed!');
        console.error('This may mean:');
        console.error('1. Realtime is not enabled in Supabase project settings');
        console.error('2. Tables are not added to supabase_realtime publication');
        console.error('3. Network/firewall blocking WebSocket connections');
      }
    });
    
    return () => {
      if (testChannel) {
        supabaseRef.current?.removeChannel(testChannel);
      }
    };
  }, []);

  // Load initial data
  useEffect(() => {
    if (token) {
      loadStudentData(token);
    } else {
      setError('No access token provided');
      setLoading(false);
    }
  }, [token, loadStudentData]);

  // Setup Realtime subscription function (can be called for reconnection)
  const setupRealtimeSubscription = useCallback(() => {
    if (!studentData?.id || !supabaseRef.current) {
      console.log('Cannot setup subscription: missing studentData or supabase client');
      return null;
    }

    console.log('Setting up Realtime subscription for student:', studentData.id);
    console.log('Current rooms:', studentData.rooms.map(r => r.id));

    // Use unique channel name with timestamp to avoid conflicts on reconnection
    const channelName = `student-portal-${studentData.id}-${Date.now()}`;
    console.log('Creating channel:', channelName);

    // Subscribe to ALL assignment changes, room_students changes, and filter client-side
    // This is more reliable than server-side filtering
    const channel = supabaseRef.current
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment INSERT detected:', payload);
          const newAssignment = payload.new as StudentData['assignments'][0];
          
          // Get current room IDs from ref (always up-to-date)
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this assignment is for one of the student's rooms
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(newAssignment.room_id)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('New assignment for student! Adding to list...');
          
          // Add new assignment to the list
          setStudentData(prev => {
            if (!prev) return prev;
            
            // Check if assignment already exists (prevent duplicates)
            if (prev.assignments.some(a => a.id === newAssignment.id)) {
              console.log('Assignment already exists, skipping duplicate');
              return prev;
            }
            
            return {
              ...prev,
              assignments: [...prev.assignments, newAssignment]
            };
          });

          // Show notification
          const currentData = studentDataRef.current;
          const room = currentData?.rooms.find(r => r.id === newAssignment.room_id);
          toast.success(
            `New Assignment: ${newAssignment.title}`,
            {
              description: room ? `Posted in ${room.name}` : 'New assignment available',
              duration: 5000,
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment UPDATE detected:', payload);
          const updatedAssignment = payload.new as StudentData['assignments'][0];
          
          // Get current room IDs from ref (always up-to-date)
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this assignment is for one of the student's rooms
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(updatedAssignment.room_id)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('Assignment update for student! Updating list...');
          
          // Update the assignment in the list
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.map(a => 
                a.id === updatedAssignment.id ? updatedAssignment : a
              )
            };
          });

          toast.info('An assignment was updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment DELETE detected:', payload);
          const deletedId = payload.old.id;
          const deletedRoomId = payload.old.room_id;
          
          // Get current room IDs from ref (always up-to-date)
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this assignment was for one of the student's rooms
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(deletedRoomId)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('Assignment deletion for student! Removing from list...');
          
          // Remove the assignment from the list
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.filter(a => a.id !== deletedId)
            };
          });

          toast.info('An assignment was removed');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_students'
        },
        (payload) => {
          console.log('room_students change detected:', payload);
          console.log('Event type:', payload.eventType);
          
          // Type the payload data
          const newRecord = payload.new as { student_id?: string; room_id?: string } | null;
          const oldRecord = payload.old as { student_id?: string; room_id?: string } | null;
          
          const currentStudentId = studentDataRef.current?.id;
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this involves the current student
          const isForStudent = newRecord?.student_id === currentStudentId || 
                               oldRecord?.student_id === currentStudentId;
          
          // Also check if it's a student being added to one of our rooms (new classmate)
          const isInOurRooms = currentRoomIds.length > 0 && (
            (newRecord?.room_id && currentRoomIds.includes(newRecord.room_id)) || 
            (oldRecord?.room_id && currentRoomIds.includes(oldRecord.room_id))
          );
          
          if (!isForStudent && !isInOurRooms) {
            console.log('room_students change not relevant, ignoring');
            return;
          }

          console.log('Room assignment change detected! Reloading student data...');
          
          // Reload the entire student data to get updated rooms and classmates
          if (token) {
            loadStudentData(token);
            
            if (isForStudent) {
              toast.info('Your classroom assignments have been updated', { duration: 3000 });
            } else {
              toast.info('A new classmate joined your classroom', { duration: 3000 });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to portal updates!');
          setRealtimeConnected(true);
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
          toast.success('Live updates connected!', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to portal updates');
          setRealtimeConnected(false);
          toast.error('Live updates connection failed');
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
          setRealtimeConnected(false);
          attemptReconnect();
        } else if (status === 'CLOSED') {
          console.log('🔌 Subscription closed');
          setRealtimeConnected(false);
          // Don't reconnect on intentional close (like unmount)
        }
      });

    return channel;
  }, [studentData?.id, token, loadStudentData]);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      toast.error('Unable to connect to live updates. Please refresh the page.', { duration: 5000 });
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000); // Max 10 seconds

    console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      console.log('Executing reconnection attempt...');
      
      // Clean up old subscription properly
      if (subscriptionRef.current && supabaseRef.current) {
        console.log('Removing old channel...');
        await supabaseRef.current.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new subscription
      const newChannel = setupRealtimeSubscription();
      if (newChannel) {
        subscriptionRef.current = newChannel;
        console.log('New channel created and stored');
      } else {
        console.error('Failed to create new channel');
      }
    }, delay);
  }, [setupRealtimeSubscription]);

  // Setup Realtime subscription for assignments and room changes
  useEffect(() => {
    const channel = setupRealtimeSubscription();
    if (channel) {
      subscriptionRef.current = channel;
    }

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Realtime subscription');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        supabaseRef.current?.removeChannel(subscriptionRef.current);
      }
    };
  }, [setupRealtimeSubscription]);

  // Handle page visibility changes (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('📱 Page went to background');
      } else {
        console.log('📱 Page came to foreground');
        
        // Check if connection is lost and reconnect
        if (!realtimeConnected && studentData?.id && supabaseRef.current) {
          console.log('Reconnecting after returning to foreground...');
          reconnectAttemptsRef.current = 0; // Reset attempts when manually reconnecting
          
          // Clean up old subscription
          if (subscriptionRef.current) {
            await supabaseRef.current.removeChannel(subscriptionRef.current);
            subscriptionRef.current = null;
          }

          // Wait a bit for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create new subscription
          const newChannel = setupRealtimeSubscription();
          if (newChannel) {
            subscriptionRef.current = newChannel;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [realtimeConnected, studentData?.id, setupRealtimeSubscription]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Network connection restored');
      toast.success('Internet connection restored', { duration: 2000 });
      
      // Reconnect WebSocket if needed
      if (!realtimeConnected && studentData?.id && supabaseRef.current) {
        console.log('Reconnecting after network restoration...');
        reconnectAttemptsRef.current = 0;
        
        if (subscriptionRef.current) {
          await supabaseRef.current.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const newChannel = setupRealtimeSubscription();
        if (newChannel) {
          subscriptionRef.current = newChannel;
        }
      }
      
      // Reload data to ensure we have latest
      if (token) {
        loadStudentData(token);
      }
    };

    const handleOffline = () => {
      console.log('🌐 Network connection lost');
      toast.error('Internet connection lost', { duration: 3000 });
      setRealtimeConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [realtimeConnected, studentData?.id, token, setupRealtimeSubscription, loadStudentData]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No access token provided. Please use the link provided by your teacher.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error || 'Failed to load student data'}</p>
            <p className="mt-2 text-sm text-gray-600">
              Please contact your teacher if this problem persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome, {studentData.name}! 👋</h1>
                <p className="text-sm text-gray-600">{studentData.email || 'Student Portal'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {realtimeConnected ? (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Updates Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              )}
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* My Rooms Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Classroom{studentData.rooms.length > 1 ? 's' : ''}</h2>
          </div>

          {studentData.rooms.length === 0 ? (
            <Alert>
              <AlertDescription>
                You haven't been assigned to any classrooms yet. Please contact your teacher.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {studentData.rooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    {room.grade_level && (
                      <Badge variant="secondary" className="w-fit">
                        Grade {room.grade_level}
                      </Badge>
                    )}
                    <CardDescription>{room.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {studentData.assignments.filter(a => a.room_id === room.id).length} assignment(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* My Assignments Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
          </div>

          {studentData.assignments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No assignments yet. Check back later!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {studentData.assignments.map((assignment) => {
                const room = studentData.rooms.find(r => r.id === assignment.room_id);
                const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
                const isOverdue = dueDate && dueDate < new Date();

                return (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {room?.name && (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Home className="h-3 w-3" />
                                {room.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={assignment.status === 'active' ? 'default' : 'secondary'}
                          className={isOverdue ? 'bg-red-100 text-red-700 border-red-200' : ''}
                        >
                          {isOverdue ? 'Overdue' : assignment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-3">
                        {assignment.description || 'No description provided'}
                      </p>
                      {dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {dueDate.toLocaleDateString()}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* My Classmates Section */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Classmates</h2>
          </div>

          {!studentData.classmates || studentData.classmates.length === 0 ? (
            <Alert>
              <AlertDescription>
                No other students in your classrooms yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {studentData.classmates.map((classmate) => (
                <Card key={classmate.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{classmate.name}</CardTitle>
                        {classmate.email && (
                          <CardDescription className="text-xs truncate">
                            {classmate.email}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {classmate.primary_language && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Language:</span>
                          <span>{classmate.primary_language}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Shared classrooms:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {classmate.rooms.map((room) => (
                            <Badge key={room.id} variant="secondary" className="text-xs">
                              {room.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Help Section */}
        <section className="mt-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                If you have any questions about your assignments or need assistance, please contact your teacher.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default StudentPortalPage;
