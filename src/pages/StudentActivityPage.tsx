import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Sparkles, Brain, Gamepad2, Pencil } from 'lucide-react';

export const StudentActivityPage = () => {
  const { roomId, studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { student, room } = location.state || {};

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const activities = [
    {
      id: 'story',
      title: 'Start Story',
      description: 'Interactive storytelling and reading',
      icon: BookOpen,
      color: 'bg-primary/10 text-primary',
      buttonColor: 'primary',
    },
    {
      id: 'game',
      title: 'Start Game',
      description: 'Educational games and puzzles',
      icon: Gamepad2,
      color: 'bg-secondary/10 text-secondary',
      buttonColor: 'secondary',
    },
    {
      id: 'creative',
      title: 'Creative Writing',
      description: 'Writing prompts and exercises',
      icon: Pencil,
      color: 'bg-accent/10 text-accent',
      buttonColor: 'accent',
    },
    {
      id: 'brain',
      title: 'Brain Training',
      description: 'Logic and problem-solving activities',
      icon: Brain,
      color: 'bg-purple-100 text-purple-600',
      buttonColor: 'default',
    },
  ];

  if (!student || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <Header />
        <div className="container mx-auto px-6 py-8 pt-32">
          <p className="text-center text-muted-foreground">Student or room information not found</p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate('/rooms')}>Back to Rooms</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(280,40%,98%)] via-[hsl(280,30%,95%)] to-[hsl(35,95%,95%)]">
      <Header />
      
      <main className="container mx-auto px-6 py-8 pt-32">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(`/rooms/${roomId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Room
        </Button>

        {/* Student Info Card */}
        <Card className="mb-8 shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 text-2xl font-bold bg-primary text-primary-foreground">
                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{student.name}</h1>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{room.name}</Badge>
                  {student.primary_language && (
                    <Badge variant="outline">{student.primary_language}</Badge>
                  )}
                  {student.date_of_birth && (
                    <Badge variant="outline">
                      Age: {Math.floor((new Date().getTime() - new Date(student.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))}
                    </Badge>
                  )}
                </div>
                {student.skills && Array.isArray(student.skills) && student.skills.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-1">Skills:</p>
                    <div className="flex gap-2 flex-wrap">
                      {student.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Choose an Activity</h2>
          <p className="text-muted-foreground">Select an activity for {student.name.split(' ')[0]} to begin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-xl ${activity.color}`}>
                    <activity.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{activity.title}</CardTitle>
                </div>
                <p className="text-muted-foreground">{activity.description}</p>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant={activity.buttonColor as any}>
                  Start Activity
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder Notice */}
        <Card className="mt-8 bg-muted/50 border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Activity Implementation Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              These activity buttons are placeholders. The full interactive learning activities will be
              implemented in future phases of development.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
