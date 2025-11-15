import { useEffect, useState, useRef } from 'react';
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

  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabasePublishableKey();
    
    console.log('Initializing Supabase client...');
    console.log('Supabase URL:', supabaseUrl);
    
    supabaseRef.current = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    console.log('✅ Supabase client initialized');
  }, []);

  // Load initial data
  useEffect(() => {
    if (token) {
      loadStudentData(token);
    } else {
      setError('No access token provided');
      setLoading(false);
    }
  }, [token]);

  // Setup Realtime subscription for assignments and room changes
  useEffect(() => {
    if (!studentData?.id || !supabaseRef.current) return;

    const roomIds = studentData.rooms.map(r => r.id);
    
    console.log('Setting up Realtime subscription for student:', studentData.id);
    console.log('Monitoring rooms:', roomIds);

    // Subscribe to ALL assignment changes, room_students changes, and filter client-side
    // This is more reliable than server-side filtering
    const channel = supabaseRef.current
      .channel('student-portal-updates')
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
          
          // Check if this assignment is for one of the student's rooms
          if (roomIds.length > 0 && !roomIds.includes(newAssignment.room_id)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('New assignment for student! Adding to list...');
          
          // Add new assignment to the list
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: [...prev.assignments, newAssignment]
            };
          });

          // Show notification
          const room = studentData.rooms.find(r => r.id === newAssignment.room_id);
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
          
          // Check if this assignment is for one of the student's rooms
          if (roomIds.length > 0 && !roomIds.includes(updatedAssignment.room_id)) {
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
          
          // Check if this assignment was for one of the student's rooms
          if (roomIds.length > 0 && !roomIds.includes(deletedRoomId)) {
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
          
          // Type the payload data
          const newRecord = payload.new as { student_id?: string; room_id?: string } | null;
          const oldRecord = payload.old as { student_id?: string; room_id?: string } | null;
          
          // Check if this involves the current student
          const isForStudent = newRecord?.student_id === studentData.id || 
                               oldRecord?.student_id === studentData.id;
          
          // Also check if it's a student being added to one of our rooms (new classmate)
          const isInOurRooms = roomIds.length > 0 && (
            (newRecord?.room_id && roomIds.includes(newRecord.room_id)) || 
            (oldRecord?.room_id && roomIds.includes(oldRecord.room_id))
          );
          
          if (!isForStudent && !isInOurRooms) {
            console.log('room_students change not relevant, ignoring');
            return;
          }

          console.log('Room assignment change detected! Reloading student data...');
          
          // Reload the entire student data to get updated rooms and classmates
          if (token) {
            loadStudentData(token);
            toast.info('Your classroom assignments have been updated', { duration: 3000 });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to portal updates!');
          setRealtimeConnected(true);
          toast.success('Live updates connected!', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to portal updates');
          setRealtimeConnected(false);
          toast.error('Live updates connection failed');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
          setRealtimeConnected(false);
        } else if (status === 'CLOSED') {
          console.log('🔌 Subscription closed');
          setRealtimeConnected(false);
        }
      });

    subscriptionRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Realtime subscription');
      if (subscriptionRef.current) {
        supabaseRef.current?.removeChannel(subscriptionRef.current);
      }
    };
  }, [studentData?.id, token]);

  const loadStudentData = async (accessToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-portal?token=${accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Invalid access token or student not found');
      }

      const data = await response.json();
      setStudentData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student data');
      toast.error('Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

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
