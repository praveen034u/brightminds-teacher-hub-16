import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserPlus,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Activity,
  Settings,
  Megaphone,
  ClipboardList,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  totalTeachers: number;
  activeTeachers: number;
  inactiveTeachers: number;
  totalStudents: number;
  totalRooms: number;
  totalAssignments: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTeachers: 0,
    activeTeachers: 0,
    inactiveTeachers: 0,
    totalStudents: 0,
    totalRooms: 0,
    totalAssignments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        let teacherQuery = supabase.from('teachers').select('id, is_active', { count: 'exact' });
        if (user?.school_id) teacherQuery = teacherQuery.eq('school_id', user.school_id);
        const { data: teachers } = await teacherQuery;

        const totalTeachers = teachers?.length || 0;
        const activeTeachers = teachers?.filter((t) => t.is_active).length || 0;

        const { count: totalStudents } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true });

        const { count: totalRooms } = await supabase
          .from('rooms')
          .select('id', { count: 'exact', head: true });

        const { count: totalAssignments } = await supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true });

        setStats({
          totalTeachers,
          activeTeachers,
          inactiveTeachers: totalTeachers - activeTeachers,
          totalStudents: totalStudents || 0,
          totalRooms: totalRooms || 0,
          totalAssignments: totalAssignments || 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.school_id]);

  const teacherActivePercent =
    stats.totalTeachers > 0 ? Math.round((stats.activeTeachers / stats.totalTeachers) * 100) : 0;

  const statCards = [
    {
      title: 'Total Teachers',
      value: stats.totalTeachers,
      icon: Users,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'from-violet-50 to-purple-50',
    },
    {
      title: 'Active Teachers',
      value: stats.activeTeachers,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      gradient: 'from-blue-500 to-cyan-600',
      bg: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: BookOpen,
      gradient: 'from-orange-500 to-amber-600',
      bg: 'from-orange-50 to-amber-50',
    },
    {
      title: 'Assignments',
      value: stats.totalAssignments,
      icon: ClipboardList,
      gradient: 'from-pink-500 to-rose-600',
      bg: 'from-pink-50 to-rose-50',
    },
    {
      title: 'Inactive Teachers',
      value: stats.inactiveTeachers,
      icon: AlertCircle,
      gradient: 'from-gray-500 to-slate-600',
      bg: 'from-gray-50 to-slate-50',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Teachers',
      description: 'View, activate or deactivate teacher accounts',
      icon: Users,
      href: '/admin/teachers',
      color: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Onboard Teacher',
      description: 'Add a new teacher to the platform',
      icon: UserPlus,
      href: '/admin/onboard',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Manage Students',
      description: 'View and manage student records',
      icon: GraduationCap,
      href: '/admin/students',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Announcements',
      description: 'Create and manage newsletters',
      icon: Megaphone,
      href: '/admin/newsletters',
      color: 'from-orange-500 to-amber-600',
    },
    {
      title: 'School Settings',
      description: 'Configure AI keys and school preferences',
      icon: Settings,
      href: '/admin/settings',
      color: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.full_name || 'Admin'}. Here's your school at a glance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br ${card.bg}`}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '—' : card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Teacher Progress */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Teacher Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active teachers</span>
            <span className="font-semibold text-foreground">
              {stats.activeTeachers} / {stats.totalTeachers}
            </span>
          </div>
          <Progress value={teacherActivePercent} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {teacherActivePercent}% of teachers are currently active on the platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Activity className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Rooms Created</p>
                <p className="text-lg font-bold">{loading ? '—' : stats.totalRooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Assignments Set</p>
                <p className="text-lg font-bold">{loading ? '—' : stats.totalAssignments}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="text-lg font-bold">{teacherActivePercent}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="group cursor-pointer border border-border hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
