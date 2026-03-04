import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const extractToken = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';

  if (raw.includes('token=')) {
    try {
      const parsedUrl = new URL(raw);
      return parsedUrl.searchParams.get('token') || raw;
    } catch {
      const queryIndex = raw.indexOf('?');
      if (queryIndex !== -1) {
        const queryString = raw.slice(queryIndex + 1);
        const params = new URLSearchParams(queryString);
        return params.get('token') || raw;
      }
    }
  }

  return raw;
};

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const [studentToken, setStudentToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const normalizedToken = extractToken(studentToken);

    if (!normalizedToken) {
      setError('Please enter your Student Token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      localStorage.setItem('student_presigned_token', normalizedToken);
      toast.success('Token accepted. Opening your student portal...');
      navigate(`/student-portal?token=${encodeURIComponent(normalizedToken)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to open student portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/20 rounded-3xl overflow-hidden">
        <CardHeader className="text-center bg-gradient-to-r from-primary/20 to-secondary/20 pb-8 pt-10">
          <div className="flex justify-center mb-4">
            <img
              src="/brightminds-logo1.png"
              alt="BrightMinds"
              className="h-16 w-16 rounded-2xl"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Welcome to BrightMinds 👋
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            Enter your Student Token to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Student Token</label>
              <Input
                type="text"
                placeholder="Paste token or full student portal link"
                value={studentToken}
                onChange={(e) => setStudentToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                className="h-14 text-base text-center font-mono rounded-2xl border-2 border-muted focus:border-primary"
                autoFocus
              />
            </div>
            <Button
              onClick={handleContinue}
              disabled={loading || !studentToken.trim()}
              className="w-full h-14 text-lg rounded-2xl font-semibold"
              size="lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Continue
                </>
              )}
            </Button>
            <div className="text-center">
              <button
                onClick={() => toast.info('Ask your teacher for the student token link or token code')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <HelpCircle className="h-4 w-4" />
                I do not have my token
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLoginPage;
