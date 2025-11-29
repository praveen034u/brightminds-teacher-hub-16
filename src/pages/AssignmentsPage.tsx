import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';
import { Calendar, Clock, Users, Plus, Trash2, Edit, FileText, Upload, Archive, Eye, CheckCircle, XCircle, Loader, Gamepad2, User, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '@/components/LoadingState';


function AssignmentsPage() {
  // Form state for assignment creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
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
  
  // Real-time subscription state
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const broadcastChannelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Form state
  const [dueDate, setDueDate] = useState('');
  const [grade, setGrade] = useState('');
  const [roomType, setRoomType] = useState<'prebuilt' | 'custom'>('prebuilt');
  const [selectedPrebuiltRoom, setSelectedPrebuiltRoom] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('none');
  const [selectedQuestionPaper, setSelectedQuestionPaper] = useState('');
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  
  // Custom room assignment templates
  const [savedAssignmentTemplates, setSavedAssignmentTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatesFeatureAvailable, setTemplatesFeatureAvailable] = useState(false);

  // Auto-enable template saving for custom rooms
  useEffect(() => {
    if (roomType === 'custom') {
      setSaveAsTemplate(true);
      if (!templateName.trim()) {
        setTemplateName(`Custom Assignment ${new Date().toLocaleDateString()}`);
      }
    } else {
      setSaveAsTemplate(false);
      setTemplateName('');
    }
  }, [roomType]);
  
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
      
      // Temporarily disable progress API due to authentication issues
      // Use basic assignment data with zero progress values
      let assignmentsWithProgress;
      console.log('📊 Using basic assignment data (progress API temporarily disabled)');
      assignmentsWithProgress = assignmentsData.map((assignment: any) => ({
        ...assignment,
        totalStudents: 0,
        completedStudents: 0,
        inProgressStudents: 0,
        notStartedStudents: 0,
        averageScore: 0
      }));
      
      setAssignments(assignmentsWithProgress);
      setRooms(roomsData);
      
      // Load saved assignment templates for custom rooms
      try {
        console.log('📝 Loading assignment templates from local storage...');
        
        // Load from localStorage as fallback while server function is being fixed
        const localTemplates = JSON.parse(localStorage.getItem(`templates_${auth0UserId}`) || '[]');
        console.log('📋 Loaded local templates:', localTemplates?.length || 0);
        setSavedAssignmentTemplates(localTemplates || []);
        setTemplatesFeatureAvailable(true);
      } catch (error) {
        console.warn('⚠️ Error loading assignment templates:', error);
        // Don't let template loading errors break the main app
        setSavedAssignmentTemplates([]);
      }
      
      // Load question papers from Supabase (with localStorage fallback)
      try {
        console.log('📄 Loading question papers...');
        const { data: questionPapersData, error: qpError } = await supabase
          .from('question_papers')
          .select('*')
          .eq('teacher_id', auth0UserId)
          .order('created_at', { ascending: false });
        
        if (qpError) {
          console.warn('Error loading question papers from Supabase, using localStorage:', qpError);
          // Fallback to localStorage
          const localPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
          setQuestionPapers(localPapers || []);
        } else {
          console.log('📄 Loaded question papers:', questionPapersData?.length || 0);
          setQuestionPapers(questionPapersData || []);
          // Sync localStorage with Supabase
          localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(questionPapersData || []));
        }
      } catch (error) {
        console.warn('⚠️ Error loading question papers:', error);
        // Fallback to localStorage
        const localPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
        setQuestionPapers(localPapers || []);
      }
      
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
    
    console.log('🚀 Starting assignment creation...');
    console.log('📋 Form state:', { title, description, dueDate, roomType, selectedPrebuiltRoom, selectedRoom });
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    if (!auth0UserId) {
      console.error('❌ No auth0UserId available');
      toast.error('Authentication error: Please log in again');
      return;
    }

    try {
      // DEBUG: Check room selection values before creating assignment data
      console.log('🔍 PRE-ASSIGNMENT CREATION DEBUG:');
      console.log(`   - selectedRoom value: "${selectedRoom}"`);
      console.log(`   - selectedRoom type: ${typeof selectedRoom}`);
      console.log(`   - selectedRoom !== 'none': ${selectedRoom !== 'none'}`);
      console.log(`   - selectedRoom && selectedRoom !== 'none': ${selectedRoom && selectedRoom !== 'none'}`);
      
      const finalRoomId = selectedRoom && selectedRoom !== 'none' ? selectedRoom : null;
      console.log(`   - Final room_id will be: ${finalRoomId}`);

      const assignmentData = {
        roomType: roomType,
        roomValue: roomType === 'prebuilt' ? selectedPrebuiltRoom : selectedQuestionPaper,
        gameConfig: roomType === 'prebuilt' ? selectedGameConfig : null,
        title,
        description,
        grade,
        dueDate,
        status: 'active',
        room_id: finalRoomId, // Add room assignment
        question_paper_id: roomType === 'custom' ? selectedQuestionPaper : null, // Link to question paper
      };

      console.log('📤 Creating assignment with data:', JSON.stringify(assignmentData, null, 2));
      console.log('🔑 Auth0 User ID:', auth0UserId);
      console.log('🎮 Selected game config:', selectedGameConfig);
      console.log('🏠 Selected room:', selectedRoom);
      
      // Debug: Show exactly what room data is being sent
      if (roomType === 'prebuilt' && selectedRoom && selectedRoom !== 'none') {
        const selectedRoomData = rooms.find(r => r.id === selectedRoom);
        console.log('🎯 PRE-BUILT GAME + ROOM ASSIGNMENT:');
        console.log(`   Room Name: ${selectedRoomData?.name || 'Unknown'}`);
        console.log(`   Room ID: ${selectedRoom}`);
        console.log(`   Students in Room: ${selectedRoomData?.student_count || 0}`);
        console.log(`   Assignment should ONLY go to students in this room!`);
      }

      // For custom rooms, save as template if requested
      if (roomType === 'custom' && saveAsTemplate && templateName.trim()) {
        try {
          // Get the actual teacher ID from the teacher profile API
          const teacherProfile = await meAPI.get(auth0UserId);
          const actualTeacherId = teacherProfile?.id;
          
          if (!actualTeacherId) {
            throw new Error('Could not get teacher ID');
          }
          
          const templateData = {
            teacher_id: actualTeacherId,
            template_type: 'custom_room',
            name: templateName.trim(),
            title,
            description,
            template_data: {
              roomType,
              roomValue: '',
              gameConfig: null
            }
          };
          
          console.log('📝 Attempting to save template:', {
            templateName: templateName.trim(),
            actualTeacherId,
            auth0UserId,
            templateData
          });
          
          // Save template - use local storage until server function is fixed
        console.log('📝 Saving assignment template locally...');
        
        let templateError = null;
        
        try {
          // Create template object with unique ID
          const templateObj = {
            id: `template_${Date.now()}`,
            ...templateData,
            teacher_id: actualTeacherId,
            created_at: new Date().toISOString()
          };
          
          // Get existing templates from localStorage
          const existingTemplates = JSON.parse(localStorage.getItem(`templates_${auth0UserId}`) || '[]');
          
          // Add new template
          const updatedTemplates = [templateObj, ...existingTemplates];
          
          // Save to localStorage
          localStorage.setItem(`templates_${auth0UserId}`, JSON.stringify(updatedTemplates));
          
          console.log('✅ Template saved locally:', templateObj);
          toast.success(`Template "${templateName}" saved locally for future use!`);
          
          // Update the templates list in state
          setSavedAssignmentTemplates(updatedTemplates);
        } catch (localError) {
          console.error('❌ Failed to save template locally:', localError);
          templateError = {
            code: '500',
            message: 'Failed to save template locally',
            details: localError.message,
            hint: undefined
          };
        }
            
          if (templateError) {
            console.error('❌ Template save error details:', {
              code: templateError.code,
              message: templateError.message,
              details: templateError.details,
              hint: templateError.hint,
              fullError: templateError
            });
            
            if (templateError.code === 'PGRST106' || templateError.message.includes('does not exist')) {
              console.warn('📝 Assignment templates table does not exist. Please run the SQL migration first.');
              toast.warning('Assignment created! To save templates, please contact your administrator to set up the templates table.');
            } else if (templateError.code === '42501') {
              console.warn('🔒 RLS policy error - please run the RLS fix SQL script');
              toast.warning('Assignment created! Template saving needs database permissions to be fixed.');
            } else {
              console.error('❌ Failed to save template:', templateError.message || 'Unknown error');
              toast.warning(`Assignment created but template save failed: ${templateError.message || 'Unknown error'}`);
            }
          } else {
            console.log('✅ Assignment template saved successfully');
            toast.success('Assignment created and saved as template!');
            // Reload templates
            loadData();
          }
        } catch (templateError) {
          console.error('❌ Error saving template:', templateError);
          toast.warning('Assignment created but template save failed');
        }
      }

      const result = await assignmentsAPI.create(auth0UserId, assignmentData);
      console.log('✅ Assignment created successfully:', result);
      
      if (roomType === 'prebuilt' || !saveAsTemplate) {
        toast.success('Assignment created successfully');
      }
      
      setShowCreateDialog(false);
      
      // Reset form
      setTitle('');
      setGrade('');
      setDescription('');
      setDueDate('');
      setRoomType('prebuilt');
      setSelectedPrebuiltRoom('');
      setSelectedQuestionPaper('');
      setSelectedRoom('none');
      setSelectedGameConfig({ difficulty: 'easy', category: '' });
      setAvailableCategories([]);
      setSelectedTemplate('');
      setSaveAsTemplate(false);
      setTemplateName('');
      
      loadData();
    } catch (error: any) {
      console.error('❌ Error creating assignment:', error);
      
      // More detailed error logging
      if (error?.response) {
        console.error('📡 API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        toast.error(`Failed to create assignment: ${error.response.status} ${error.response.statusText}`);
      } else if (error?.message) {
        console.error('💬 Error Message:', error.message);
        toast.error(`Failed to create assignment: ${error.message}`);
      } else {
        console.error('🔍 Unknown error type:', typeof error, error);
        toast.error('Failed to create assignment: Unknown error occurred');
      }
    }
  };



  const validateForm = () => {
    console.log('🔍 Validating form...');
    
    if (!title.trim()) {
      console.log('❌ Validation failed: No title');
      toast.error('Please enter a title');
      return false;
    }
    if (!grade) {
      console.log('❌ Validation failed: No grade selected');
      toast.error('Please select a grade level');
      return false;
    }
    if (!description.trim()) {
      console.log('❌ Validation failed: No description');
      toast.error('Please enter a description');
      return false;
    }
    if (!dueDate) {
      console.log('❌ Validation failed: No due date');
      toast.error('Please select a due date');
      return false;
    }
    if (roomType === 'prebuilt' && !selectedPrebuiltRoom) {
      console.log('❌ Validation failed: No game selected for prebuilt room');
      toast.error('Please select a game');
      return false;
    }
    if (roomType === 'prebuilt' && selectedPrebuiltRoom) {
      const selectedGame = games.find(g => g.id === selectedPrebuiltRoom);
      console.log('🎮 Selected game for validation:', selectedGame);
      if (selectedGame?.categories && selectedGame.categories.length > 0 && !selectedGameConfig.category) {
        console.log('❌ Validation failed: No category selected for game with categories');
        toast.error('Please select a category for this game');
        return false;
      }
    }
    if (roomType === 'custom' && !selectedQuestionPaper) {
      console.log('❌ Validation failed: No question paper selected for custom assignment');
      toast.error('Please select a question paper');
      return false;
    }
    
    // Validate custom room template saving
    if (roomType === 'custom' && saveAsTemplate && !templateName.trim()) {
      console.log('❌ Validation failed: No template name provided');
      toast.error('Please enter a template name to save');
      return false;
    }
    
    console.log('✅ Form validation passed');
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



  const handleViewAssignmentDetails = async (assignment: any) => {
    try {
      console.log('📊 Loading assignment details for:', assignment.id, assignment.title);
      setSelectedAssignment(assignment);
      setShowAssignmentDetails(true);
      setAssignmentProgress([]); // Reset progress data
      
      // Use the teacher-progress API to get comprehensive data
      const supabaseUrl = getSupabaseUrl();
      
      console.log('🔍 Fetching detailed progress data...');
      try {
        const progressResult = await teacherProgressAPI.getAssignmentProgress(auth0UserId, assignment.id);
        console.log('📊 Progress API response:', progressResult);
        
        if (progressResult.progress && Array.isArray(progressResult.progress)) {
          const progressData = progressResult.progress.map((student: any) => ({
            id: student.student_id,
            student_name: student.student_name,
            student_email: student.student_email || 'No email',
            status: student.status,
            // Use attempts_count provided by the teacher-progress function when available
            attempts: (typeof student.attempts_count !== 'undefined') ? student.attempts_count : (student.status === 'not_started' ? 0 : 1),
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
      } catch (error) {
        console.error('❌ Progress API error:', error);
        
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
              <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto px-6">
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
                        Custom Assignment
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
                        {/* Saved Templates Selection - only show if we have templates or if the feature is available */}
                        {savedAssignmentTemplates.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Use Saved Template (Optional)</Label>
                            <Select value={selectedTemplate} onValueChange={(value) => {
                              setSelectedTemplate(value);
                              if (value && value !== 'new') {
                                const template = savedAssignmentTemplates.find(t => t.id === value);
                                if (template) {
                                  setTitle(template.title);
                                  setDescription(template.description);
                                }
                              }
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a saved template or create new..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">
                                  <div className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    <span>Create New Assignment</span>
                                  </div>
                                </SelectItem>
                                {savedAssignmentTemplates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{template.name}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {new Date(template.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Save as Template Option - only show if feature is available */}
                        {templatesFeatureAvailable && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="saveAsTemplate"
                                checked={saveAsTemplate}
                                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <Label htmlFor="saveAsTemplate" className="text-sm font-medium">
                                Save as Template for Future Use
                              </Label>
                            </div>
                          
                          {saveAsTemplate && (
                            <div className="space-y-1">
                              <Label htmlFor="templateName" className="text-sm">Template Name *</Label>
                              <Input
                                id="templateName"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Enter a name for this template..."
                                className="w-full"
                              />
                              <p className="text-xs text-gray-500">
                                This will save the assignment details as a reusable template.
                              </p>
                            </div>
                          )}
                          </div>
                        )}
                        
                        {/* Show message if templates feature is not available */}
                        {!templatesFeatureAvailable && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-amber-800">
                              <span className="text-sm">💡</span>
                              <span className="text-sm font-medium">Templates Feature</span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">
                              To save and reuse assignment templates, the database needs to be set up. Contact your administrator to enable this feature.
                            </p>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          {/* Question Paper Selection */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Select Question Paper *</Label>
                            <Select value={selectedQuestionPaper} onValueChange={setSelectedQuestionPaper}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a saved question paper..." />
                              </SelectTrigger>
                              <SelectContent>
                                {questionPapers.length === 0 ? (
                                  <SelectItem value="no-papers" disabled>
                                    No question papers available
                                  </SelectItem>
                                ) : (
                                  questionPapers.map((paper) => (
                                    <SelectItem key={paper.id} value={paper.id}>
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-3 w-3" />
                                          <span>{paper.title}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 ml-2">
                                          ({paper.question_count || 0} questions)
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            
                            {/* Show selected question paper details */}
                            {selectedQuestionPaper && questionPapers.find(p => p.id === selectedQuestionPaper) && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <div className="h-8 w-8 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-green-900 mb-1">
                                      {questionPapers.find(p => p.id === selectedQuestionPaper)?.title}
                                    </div>
                                    <p className="text-xs text-green-700">
                                      {questionPapers.find(p => p.id === selectedQuestionPaper)?.description || 'No description'}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs bg-white">
                                        📝 {questionPapers.find(p => p.id === selectedQuestionPaper)?.question_count || 0} Questions
                                      </Badge>
                                      <Badge variant="outline" className="text-xs bg-white">
                                        🏆 {questionPapers.find(p => p.id === selectedQuestionPaper)?.total_marks || 0} Marks
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Help section */}
                          {questionPapers.length === 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-2">
                                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-sm">💡</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-blue-900 mb-1">No Question Papers Yet</div>
                                  <p className="text-xs text-blue-700 mb-3">
                                    Create question papers from the <strong>Question Papers</strong> page. 
                                    You can create questions using OCR (scan images), manual entry, or AI generation.
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/question-papers')}
                                    className="text-xs"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Go to Question Papers
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
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

                {/* Grade */}
                <div className="space-y-1">
                  <Label htmlFor="grade" className="text-sm">Grade *</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select grade level..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Grade 1</SelectItem>
                      <SelectItem value="2">Grade 2</SelectItem>
                      <SelectItem value="3">Grade 3</SelectItem>
                      <SelectItem value="4">Grade 4</SelectItem>
                      <SelectItem value="5">Grade 5</SelectItem>
                      <SelectItem value="6">Grade 6</SelectItem>
                      <SelectItem value="7">Grade 7</SelectItem>
                      <SelectItem value="8">Grade 8</SelectItem>
                      <SelectItem value="9">Grade 9</SelectItem>
                      <SelectItem value="10">Grade 10</SelectItem>
                      <SelectItem value="11">Grade 11</SelectItem>
                      <SelectItem value="12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
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

                {/* Room Assignment */}
                <div className="space-y-2">
                  <Label htmlFor="assignRoom" className="text-sm font-medium">Assign to Room (Optional)</Label>
                  <Select value={selectedRoom} onValueChange={(value) => {
                    setSelectedRoom(value);
                    console.log('🏠 Room selection changed to:', value);
                    const room = rooms.find(r => r.id === value);
                    if (room) {
                      console.log(`   📊 Selected room "${room.name}" has ${room.student_count || 0} students`);
                    } else if (value === 'none') {
                      console.log('   ⚠️ No room selected - assignment will be available to all students');
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a room to assign this assignment..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                          <span>No room assignment</span>
                        </div>
                      </SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>{room.name}</span>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">({room.student_count || 0} students)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {selectedRoom && selectedRoom !== 'none'
                      ? `This assignment will be available to students in the selected room.`
                      : `Assignment will be available to all students. You can assign it to a specific room later.`
                    }
                  </p>
                </div>

                <Button type="submit" className="w-full">
                  {roomType === 'custom' && saveAsTemplate ? 'Create and Save Assignment' : 'Create Assignment'}
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
                            {assignment.grade && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                Grade {assignment.grade}
                              </Badge>
                            )}
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
                            {typeof student.correct === 'number' && typeof student.total === 'number' && student.total > 0
                              ? `${Math.round((student.correct / student.total) * 100)}% (${student.correct}/${student.total})`
                              : (student.score
                                 && student.score > 0
                                  ? `${student.score}%`
                                  : '0%')}
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
                    onClick={() => selectedAssignment && handleViewAssignmentDetails(selectedAssignment)}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Progress
                  </Button>
                
                 
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    📊 Export Progress
                  </Button>
                 
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default AssignmentsPage;

