import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { QuickActionCard } from '@/components/cards/QuickActionCard';
import { DashboardCard } from '@/components/cards/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { studentsAPI, roomsAPI, assignmentsAPI, helpRequestsAPI, meAPI } from '@/api/edgeClient';
import { UserPlus, DoorOpen, FileText, Megaphone, Clock, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

const TeacherHome = () => {
  const { user, auth0UserId, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRooms: 0,
    pendingHelpRequests: 0,
    activeAssignments: 0,
  });
  const [rooms, setRooms] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Redirect to profile page if teacher profile is incomplete (missing full_name)
  useEffect(() => {
    if (!isLoading && user && (!user.full_name || user.full_name.trim() === '')) {
      console.log('Profile incomplete, redirecting to profile page');
      navigate('/profile', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && user.full_name && user.full_name.trim() !== '') {
      loadDashboardData();
    }
  }, [user, auth0UserId]);

  const loadDashboardData = async () => {
    try {
      console.log('🏠 Loading dashboard data for auth0UserId:', auth0UserId);
      
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
        return;
      }

      let studentsData, roomsData, assignmentsData, helpRequestsData;

      // Load core data with fallback for help requests
      try {
        [studentsData, roomsData, assignmentsData] = await Promise.all([
          studentsAPI.list(auth0UserId),
          roomsAPI.list(auth0UserId),
          assignmentsAPI.list(auth0UserId),
        ]);

        // Try to load help requests, but don't fail if it's not available
        try {
          helpRequestsData = await helpRequestsAPI.list(auth0UserId);
        } catch (helpError) {
          console.warn('⚠️ Help requests not available:', helpError);
          helpRequestsData = []; // Use empty array as fallback
        }
      } catch (coreError) {
        console.error('❌ Failed to load core data:', coreError);
        throw coreError; // Re-throw if core data fails
      }

      console.log('🏠 Real API data loaded:', {
        students: studentsData?.length || 0,
        rooms: roomsData?.length || 0,
        assignments: assignmentsData?.length || 0,
        helpRequests: helpRequestsData?.length || 0
      });

      setStats({
        totalStudents: studentsData.length,
        totalRooms: roomsData.length,
        pendingHelpRequests: helpRequestsData.filter((r: any) => r.status === 'pending').length,
        activeAssignments: assignmentsData.filter((a: any) => a.status === 'active').length,
      });

      setRooms(roomsData.slice(0, 3));
      setHelpRequests(helpRequestsData.filter((r: any) => r.status === 'pending').slice(0, 3));
      setAssignments(assignmentsData.slice(0, 3));

      console.log('🏠 Final stats set:', {
        totalStudents: studentsData.length,
        totalRooms: roomsData.length,
        activeAssignments: assignmentsData.filter((a: any) => a.status === 'active').length,
        pendingHelpRequests: helpRequestsData.filter((r: any) => r.status === 'pending').length
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    if (!auth0UserId) return;
    
    try {
      await helpRequestsAPI.update(auth0UserId, requestId, { status: 'resolved' });
      toast.success('Help request resolved');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to resolve request');
    }
  };

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading if user has no profile (redirect will happen via useEffect)
  if (!user || !auth0UserId || !user.full_name || user.full_name.trim() === '') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Hello {user?.full_name || 'Teacher'}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">What would you like to do today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
          <QuickActionCard
            title="Add Students"
            icon={UserPlus}
            to="/students"
            color="primary"
          />
          <QuickActionCard
            title="Rooms"
            icon={DoorOpen}
            to="/rooms"
            color="secondary"
          />
          <QuickActionCard
            title="Question Papers"
            icon={FileText}
            to="/question-papers"
            color="accent"
          />
          <QuickActionCard
            title="Assignments"
            icon={FileText}
            to="/assignments"
            color="primary"
          />
          <QuickActionCard
            title="Send Announcement"
            icon={Megaphone}
            onClick={() => toast.info('Announcement feature coming soon!')}
            color="secondary"
          />
        </div>

        {/* Row 1 - Recommended Activities & Classroom Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <DashboardCard title="Recommended Activities">
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 hover:shadow-md transition-all duration-300 cursor-pointer">
                <h3 className="font-semibold text-purple-700 mb-1">Vocabulary Builder</h3>
                <p className="text-sm text-purple-600/70">Grades 3-5</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 hover:shadow-md transition-all duration-300 cursor-pointer">
                <h3 className="font-semibold text-orange-700 mb-1">Story Prompt: Magic Forest Mystery</h3>
                <p className="text-sm text-orange-600/70">Creative writing activity</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-teal-200 hover:shadow-md transition-all duration-300 cursor-pointer">
                <h3 className="font-semibold text-teal-700 mb-1">Logic Puzzle Pack</h3>
                <p className="text-sm text-teal-600/70">For Room B</p>
              </div>
              <Button className="w-full mt-3 rounded-xl shadow-md hover:shadow-lg transition-all">Try This Activity</Button>
            </div>
          </DashboardCard>

          <DashboardCard title="Your Classroom at a Glance">
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-purple-700">{stats.totalStudents}</p>
                  <p className="text-sm text-purple-600/70 font-medium">Total Students</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 shadow-lg">
                  <DoorOpen className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-orange-700">{stats.totalRooms}</p>
                  <p className="text-sm text-orange-600/70 font-medium">Virtual Rooms</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-teal-200 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-3xl font-bold text-teal-700">{stats.activeAssignments}</p>
                  <p className="text-sm text-teal-600/70 font-medium">Active Assignments</p>
                </div>
              </div>
              <Link to="/assignments">
                <Button className="w-full mt-3 rounded-xl shadow-md hover:shadow-lg transition-all" variant="default">
                  Create Assignment
                </Button>
              </Link>
            </div>
          </DashboardCard>
        </div>

        {/* Row 2 - Virtual Rooms & Assignments */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <DashboardCard
            title="Virtual Rooms"
          >
            <div className="mb-4 text-right">
              <Link to="/rooms">
                <Button variant="outline" size="sm" className="rounded-xl border-2 hover:shadow-md transition-all">
                  Manage Rooms
                </Button>
              </Link>
            </div>
            {rooms.length > 0 ? (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <Link key={room.id} to="/rooms">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-800">{room.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {room.student_count} students
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded-lg">
                          {room.grade_level || 'All Grades'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <DoorOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No rooms yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first room to get started!</p>
              </div>
            )}
          </DashboardCard>

          <DashboardCard
            title="Assignments Center"
          >
            <div className="mb-4 text-right">
              <Link to="/assignments">
                <Button variant="outline" size="sm" className="rounded-xl border-2 hover:shadow-md transition-all">
                  Create Assignment
                </Button>
              </Link>
            </div>
            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-lg hover:border-purple-200 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                      <Badge 
                        variant={assignment.status === 'active' ? 'default' : 'secondary'}
                        className={`px-3 py-1 rounded-lg ${
                          assignment.status === 'active' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {assignment.status}
                      </Badge>
                    </div>
                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <div className="p-1.5 rounded-lg bg-blue-50">
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="font-medium">
                          Due {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No assignments yet</p>
                <p className="text-sm text-gray-400 mt-1">Create one to engage your students!</p>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Help Requests Widget */}
        {helpRequests.length > 0 && (
          <DashboardCard title="Students Needing Help" action={{ label: 'View All', onClick: () => {} }}>
            <div className="space-y-3">
              {helpRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-5 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 hover:shadow-lg transition-all duration-300 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="font-bold text-red-800">{request.students?.name}</p>
                    <p className="text-sm text-red-600 font-medium mt-1">{request.rooms?.name}</p>
                    {request.message && (
                      <p className="text-sm text-red-700/80 mt-2 italic">{request.message}</p>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleResolveRequest(request.id)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all ml-4"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}
      </main>

    </div>
  );
}

export default TeacherHome;
