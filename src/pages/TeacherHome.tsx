import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useGradeFilter } from '@/contexts/GradeFilterContext';
import { Header } from '@/components/layout/Header';
import { QuickActionCard } from '@/components/cards/QuickActionCard';
import { DashboardCard } from '@/components/cards/DashboardCard';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { studentsAPI, roomsAPI, assignmentsAPI, helpRequestsAPI, meAPI } from '@/api/edgeClient';
import { UserPlus, DoorOpen, FileText, Megaphone, Clock, CheckCircle2, Users, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/config/supabase';

const TeacherHome = () => {
  const { user, auth0UserId, isLoading, isNewUser } = useAuth();
  const navigate = useNavigate();
  
  // Use global grade filter context
  const { selectedGrades, availableGrades, setAvailableGrades, toggleGrade, clearAllGrades, isGradeSelected } = useGradeFilter();
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRooms: 0,
    pendingHelpRequests: 0,
    activeAssignments: 0,
  });
  const [rooms, setRooms] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [currentAssignmentPage, setCurrentAssignmentPage] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  
  // Store all data for filtering
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Redirect to profile page if teacher profile is incomplete (missing full_name)
  // Skip redirect on hard reload to avoid navigation loops
  useEffect(() => {
    const isReload = (() => {
      try {
        const nav = (performance.getEntriesByType('navigation') as any)[0];
        return nav && nav.type === 'reload';
      } catch {
        return false;
      }
    })();
    if (!isLoading && !isReload && isNewUser) {
      console.log('New user flow, redirecting to profile page');
      navigate('/profile', { replace: true });
    }
  }, [user, isLoading, isNewUser, navigate]);

  // Keyboard navigation for assignments
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (assignments.length <= 1) return;
      
      if (e.key === 'ArrowLeft' && currentAssignmentPage > 0) {
        setSlideDirection('left');
        setCurrentAssignmentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentAssignmentPage < assignments.length - 1) {
        setSlideDirection('right');
        setCurrentAssignmentPage(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentAssignmentPage, assignments.length]);

  // Filter data when grade selection changes (Multiple grades)
  useEffect(() => {
    if (selectedGrades.length === 0) {
      // No grades selected = show all
      setRooms(allRooms.slice(0, 3));
      setAssignments(allAssignments.slice(0, 3));
      setStats(prev => ({
        ...prev,
        totalStudents: allStudents.length,
        totalRooms: allRooms.length,
        activeAssignments: allAssignments.filter((a: any) => a.status === 'active').length,
      }));
    } else {
      // Filter by selected grades (multiple)
      const filteredStudents = allStudents.filter((student: any) =>
        student.grade && selectedGrades.includes(student.grade)
      );
      const filteredRooms = allRooms.filter((room: any) => 
        selectedGrades.includes(room.grade_level)
      );
      const filteredAssignments = allAssignments.filter((assignment: any) => 
        selectedGrades.includes(assignment.grade)
      );
      
      setRooms(filteredRooms.slice(0, 3));
      setAssignments(filteredAssignments.slice(0, 3));
      setStats(prev => ({
        ...prev,
        totalStudents: filteredStudents.length,
        totalRooms: filteredRooms.length,
        activeAssignments: filteredAssignments.filter((a: any) => a.status === 'active').length,
      }));
    }
    
    // Reset pagination when filtering
    setCurrentAssignmentPage(0);
  }, [selectedGrades, allRooms, allAssignments, allStudents]);

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

      // Store all data for filtering
      setAllRooms(roomsData);
      setAllAssignments(assignmentsData);
      setAllStudents(studentsData);

      // Load question papers to get their grades
      let questionPapersData: any[] = [];
      try {
        const teacherProfile = await meAPI.get(auth0UserId);
        if (teacherProfile?.id) {
          const { data: papers } = await supabase
            .from('question_papers')
            .select('grade')
            .eq('teacher_id', teacherProfile.id);
          questionPapersData = papers || [];
          console.log('📄 Loaded question papers for grades:', questionPapersData.length);
        }
      } catch (error) {
        console.warn('⚠️ Could not load question papers for grade extraction:', error);
      }

      // Extract unique grades from teacher profile and data
      const gradesSet = new Set<string>();
      
      // Add grades from teacher profile
      if (user?.grades_taught && Array.isArray(user.grades_taught)) {
        user.grades_taught.forEach((grade: string) => {
          if (grade && grade.trim()) gradesSet.add(grade.trim());
        });
      }
      
      // Add grades from students
      studentsData.forEach((student: any) => {
        if (student.grade) gradesSet.add(student.grade);
      });
      
      // Add grades from rooms
      roomsData.forEach((room: any) => {
        if (room.grade_level) gradesSet.add(room.grade_level);
      });
      
      // Add grades from assignments
      assignmentsData.forEach((assignment: any) => {
        if (assignment.grade) gradesSet.add(assignment.grade);
      });
      
      // Add grades from question papers
      questionPapersData.forEach((paper: any) => {
        if (paper.grade) gradesSet.add(paper.grade);
      });
      
      // Sort grades numerically (handle both "5" and "Grade 5" formats)
      const grades = Array.from(gradesSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      console.log('📊 Extracted grades for filter:', grades);
      console.log('📊 Total unique grades found:', grades.length);
      console.log('📊 Grades from students:', studentsData.map((s: any) => s.grade));
      console.log('📊 Grades from rooms:', roomsData.map((r: any) => r.grade_level));
      console.log('📊 Grades from assignments:', assignmentsData.map((a: any) => a.grade));
      console.log('📊 Grades from question papers:', questionPapersData.map((p: any) => p.grade));
      console.log('📊 Grades from teacher profile:', user?.grades_taught);
      setAvailableGrades(grades);

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
      
      <main className="container mx-auto px-6 py-8 pt-32">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Grade Filter Section - Prominent and First */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 shrink-0">
              <Filter className="h-5 w-5 text-purple-600" />
              <span>Filter by Grade:</span>
            </div>
            {availableGrades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearAllGrades}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    selectedGrades.length === 0
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md scale-105'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  All Grades
                  {selectedGrades.length === 0 && (
                    <Badge className="ml-2 bg-white text-purple-600 text-xs">All</Badge>
                  )}
                </button>
                {availableGrades.map((grade) => {
                  const isSelected = isGradeSelected(grade);
                  return (
                    <button
                      key={grade}
                      onClick={() => toggleGrade(grade)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md scale-105 ring-2 ring-purple-300 ring-offset-2'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md hover:scale-102'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                      Grade {grade}
                    </button>
                  );
                })}
                {selectedGrades.length > 0 && (
                  <button
                    onClick={clearAllGrades}
                    className="px-3 py-2 rounded-lg font-medium text-sm bg-red-100 text-red-700 border-2 border-red-200 hover:bg-red-200 hover:shadow-md transition-all duration-300 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear All ({selectedGrades.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No grades available. Create rooms or assignments to enable grade filtering.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
          <QuickActionCard
            title="Students"
            icon={UserPlus}
            to="/students"
            color="primary"
          />
          <QuickActionCard
            title="Virtual Rooms"
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
          <DashboardCard variant="indigo" title="Recommended Activities">
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

          <DashboardCard variant="purple" title="Your Classroom at a Glance">
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
            </div>
          </DashboardCard>
        </div>

        {/* Row 2 - Virtual Rooms & Assignments */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <DashboardCard
            variant="orange"
            title="Virtual Rooms"
          >
            {rooms.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 dashboard-scroll dashboard-scroll-orange">
                {rooms.map((room) => {
                  // Mock data - replace with real assignment attempt data when available
                  const totalStudents = room.student_count || 0;
                  const completed = Math.floor(totalStudents * 0.4); // 40% completed
                  const pending = Math.floor(totalStudents * 0.35); // 35% pending
                  const notStarted = totalStudents - completed - pending; // remaining not started
                  const completionRate = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;
                  
                  return (
                    <Link key={room.id} to="/rooms">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 via-white to-orange-50/30 border-2 border-orange-200 hover:shadow-lg hover:border-orange-300 transition-all duration-300 cursor-pointer">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-md">
                              <DoorOpen className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{room.name}</h3>
                              <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {room.student_count} students
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600 px-2 py-0.5 rounded-md text-xs">
                            {room.grade_level || 'All Grades'}
                          </Badge>
                        </div>
                        
                        {/* Student Activity Overview - Circular Style */}
                        <div className="bg-white/80 rounded-lg p-3 mt-3 border border-orange-100">
                          <div className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">Student Activity</div>
                          
                          {/* Circular Progress Indicators */}
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col items-center">
                              <div className="relative w-12 h-12">
                                <svg className="transform -rotate-90 w-12 h-12">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#e5e7eb"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#10b981"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${(completed / totalStudents) * 125.6} 125.6`}
                                    className="transition-all duration-500"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-green-700 mt-1">{completed}</span>
                              <span className="text-xs text-gray-600">Done</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="relative w-12 h-12">
                                <svg className="transform -rotate-90 w-12 h-12">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#e5e7eb"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#f59e0b"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${(pending / totalStudents) * 125.6} 125.6`}
                                    className="transition-all duration-500"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-amber-700 mt-1">{pending}</span>
                              <span className="text-xs text-gray-600">Pending</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="relative w-12 h-12">
                                <svg className="transform -rotate-90 w-12 h-12">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#e5e7eb"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#9ca3af"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${(notStarted / totalStudents) * 125.6} 125.6`}
                                    className="transition-all duration-500"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-base font-bold text-gray-600">{notStarted}</span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-gray-700 mt-1">{notStarted}</span>
                              <span className="text-xs text-gray-600">Not Started</span>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center h-12 px-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg border border-orange-200">
                              <span className="text-2xl font-bold text-orange-700">{completionRate}%</span>
                              <span className="text-xs text-orange-600">Complete</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
            variant="blue"
            title="Assignment Tracker"
          >
            {assignments.length > 0 ? (
              <div className="relative">
                {/* Single Assignment Display with Slide Animation */}
                <div className="overflow-hidden">
                  {assignments.map((assignment, index) => {
                    if (index !== currentAssignmentPage) return null;
                    
                    const animationClass = slideDirection === 'right' 
                      ? 'animate-slide-in-right' 
                      : 'animate-slide-in-left';
                  // Mock data - replace with real assignment attempt data when available
                  const totalAssigned = 25; // Total students assigned
                  const submitted = Math.floor(totalAssigned * 0.6); // 60% submitted
                  const inProgress = Math.floor(totalAssigned * 0.25); // 25% in progress
                  const notStarted = totalAssigned - submitted - inProgress; // remaining
                  const submissionRate = Math.round((submitted / totalAssigned) * 100);
                  const avgScore = 78; // Average score of submitted assignments
                  
                  return (
                    <div key={assignment.id} className={`p-4 rounded-xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/30 border-2 border-purple-200 hover:shadow-lg hover:border-purple-300 transition-all duration-300 ${animationClass}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                            {assignment.due_date && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={assignment.status === 'active' ? 'default' : 'secondary'}
                          className={`px-2 py-0.5 rounded-md text-xs ${
                            assignment.status === 'active' 
                              ? 'bg-green-500 text-white hover:bg-green-600' 
                              : 'bg-gray-400 text-white'
                          }`}
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                      
                      {/* Assignment Submission Pipeline */}
                      <div className="bg-white/80 rounded-lg p-3 mt-3 border border-purple-100">
                        <div className="text-xs font-semibold text-purple-700 mb-3 uppercase tracking-wide">Submission Status</div>
                        
                        {/* Horizontal Progress Pipeline */}
                        <div className="space-y-2">
                          {/* Submitted Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 shadow-md">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-blue-700">Submitted</span>
                                <span className="text-xs font-bold text-blue-700">{submitted}/{totalAssigned}</span>
                              </div>
                              <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full"
                                  style={{ width: `${(submitted / totalAssigned) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* In Progress Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 shadow-md">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-amber-700">Working On It</span>
                                <span className="text-xs font-bold text-amber-700">{inProgress}/{totalAssigned}</span>
                              </div>
                              <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
                                  style={{ width: `${(inProgress / totalAssigned) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Not Started Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-400 shadow-md">
                              <span className="text-xs font-bold text-white">{notStarted}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-gray-700">Not Started</span>
                                <span className="text-xs font-bold text-gray-700">{notStarted}/{totalAssigned}</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gray-400 transition-all duration-500 rounded-full"
                                  style={{ width: `${(notStarted / totalAssigned) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Performance Metrics - Horizontal Layout */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-purple-100">
                          <div className="flex-1 flex items-center gap-2 p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500 shadow-md">
                              <span className="text-sm font-bold text-white">{submissionRate}%</span>
                            </div>
                            <div>
                              <div className="text-xs text-purple-600 font-medium">Submission</div>
                              <div className="text-xs text-purple-500">Rate</div>
                            </div>
                          </div>
                          <div className="flex-1 flex items-center gap-2 p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500 shadow-md">
                              <span className="text-sm font-bold text-white">{avgScore}%</span>
                            </div>
                            <div>
                              <div className="text-xs text-green-600 font-medium">Average</div>
                              <div className="text-xs text-green-500">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Pagination Controls */}
                {assignments.length > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    {/* Previous Button */}
                    <button
                      onClick={() => {
                        setSlideDirection('left');
                        setCurrentAssignmentPage(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentAssignmentPage === 0}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-500 ease-out ${
                        currentAssignmentPage === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-xl transform hover:-translate-x-1 hover:scale-105'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    
                    {/* Page Dots Indicator */}
                    <div className="flex items-center gap-2">
                      {assignments.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSlideDirection(index > currentAssignmentPage ? 'right' : 'left');
                            setCurrentAssignmentPage(index);
                          }}
                          className={`transition-all duration-500 ease-out rounded-full ${
                            index === currentAssignmentPage
                              ? 'w-8 h-2 bg-gradient-to-r from-purple-500 to-indigo-600 shadow-md'
                              : 'w-2 h-2 bg-gray-300 hover:bg-purple-400 hover:scale-150 hover:shadow-sm'
                          }`}
                          aria-label={`Go to assignment ${index + 1}`}
                        />
                      ))}
                    </div>
                    
                    {/* Next Button */}
                    <button
                      onClick={() => {
                        setSlideDirection('right');
                        setCurrentAssignmentPage(prev => Math.min(assignments.length - 1, prev + 1));
                      }}
                      disabled={currentAssignmentPage === assignments.length - 1}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-500 ease-out ${
                        currentAssignmentPage === assignments.length - 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-xl transform hover:translate-x-1 hover:scale-105'
                      }`}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {/* Assignment Counter */}
                <div className="mt-3 text-center">
                  <span className="text-sm text-gray-600 font-medium">
                    Assignment {currentAssignmentPage + 1} of {assignments.length}
                  </span>
                </div>
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
          <DashboardCard variant="green" title="Students Needing Help" action={{ label: 'View All', onClick: () => {} }}>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 dashboard-scroll dashboard-scroll-green">
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
