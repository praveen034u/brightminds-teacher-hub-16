import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teacherReviewAPI } from '@/api/edgeClient';
import AssignmentReview from '@/components/teacher/AssignmentReview';

type ReviewSubmission = {
  id: string;
  status: string;
  submitted_at?: string | null;
  submission_time?: string | null;
  feedback?: string | null;
  score?: number | null;
  max_score?: number | null;
  students?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  submission_data?: any;
};

const TeacherAssignmentReviewPage = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [assignmentMeta, setAssignmentMeta] = useState<any>(null);
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const loadSubmittedAttempts = useCallback(async () => {
    if (!auth0UserId || !assignmentId) return;

    try {
      setLoading(true);
      const result = await teacherReviewAPI.getSubmissions(auth0UserId, assignmentId);
      const allSubmissions = Array.isArray(result?.submissions) ? result.submissions : [];
      const submittedOnly = allSubmissions.filter((row: ReviewSubmission) => row.status === 'submitted');

      setAssignmentMeta(result?.assignment || null);
      setSubmissions(submittedOnly);

      if (submittedOnly.length > 0 && !submittedOnly.some((row: ReviewSubmission) => row.id === selectedAttemptId)) {
        const next = submittedOnly[0];
        setSelectedAttemptId(next.id);
        setScore(typeof next.score === 'number' ? String(next.score) : '');
        setMaxMarks(typeof next.max_score === 'number' ? String(next.max_score) : '');
        setFeedback(next.feedback || '');
      }

      if (submittedOnly.length === 0) {
        setSelectedAttemptId(null);
        setScore('');
        setMaxMarks('');
        setFeedback('');
        setValidationMessage('');
      }
    } catch (error) {
      console.error('Failed to load submitted attempts:', error);
      toast.error('Failed to load submitted attempts');
      setSubmissions([]);
      setAssignmentMeta(null);
    } finally {
      setLoading(false);
    }
  }, [auth0UserId, assignmentId, selectedAttemptId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      return;
    }
    loadSubmittedAttempts();
  }, [authLoading, isAuthenticated, auth0UserId, loadSubmittedAttempts]);

  const selectedAttempt = useMemo(
    () => submissions.find((row) => row.id === selectedAttemptId) || null,
    [submissions, selectedAttemptId]
  );

  const openReview = (attempt: ReviewSubmission) => {
    setSelectedAttemptId(attempt.id);
    setScore(typeof attempt.score === 'number' ? String(attempt.score) : '');
    setMaxMarks(typeof attempt.max_score === 'number' ? String(attempt.max_score) : '');
    setFeedback(attempt.feedback || '');
    setValidationMessage('');
  };

  const validateMarks = () => {
    const parsedScore = Number(score);
    const parsedMax = Number(maxMarks);

    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      setValidationMessage('Please enter a valid Score Obtained.');
      return false;
    }

    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      setValidationMessage('Please enter a valid Maximum Marks greater than 0.');
      return false;
    }

    if (parsedScore > parsedMax) {
      setValidationMessage('Score cannot be greater than maximum marks.');
      return false;
    }

    setValidationMessage('');
    return true;
  };

  const publishResult = async () => {
    if (!auth0UserId || !selectedAttempt) return;

    if (!validateMarks()) {
      toast.error('Please fix marks validation before publishing');
      return;
    }

    const parsedScore = Number(score);
    const parsedMaxMarks = Number(maxMarks);

    try {
      setPublishing(true);
      await teacherReviewAPI.updateSubmission(auth0UserId, selectedAttempt.id, {
        status: 'completed',
        score: parsedScore,
        manualMarks: parsedScore,
        totalMarks: parsedMaxMarks,
        feedback,
        publishResult: true,
      });
      toast.success('Result published successfully');
      await loadSubmittedAttempts();
    } catch (error) {
      console.error('Failed to publish result:', error);
      toast.error('Failed to publish result');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-28 sm:pt-32 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/assignments/review-results')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignment Summary
        </Button>

        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Assignment Review</h1>
            <p className="text-sm text-muted-foreground">
              {assignmentMeta?.title || 'Assignment'}
            </p>
          </div>
          <Button variant="outline" onClick={loadSubmittedAttempts} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submitted Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No submitted attempts are pending review.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">Student</th>
                      <th className="py-2 pr-3">Submitted At</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((attempt) => (
                      <tr key={attempt.id} className="border-b">
                        <td className="py-3 pr-3 font-medium">{attempt.students?.name || 'Student'}</td>
                        <td className="py-3 pr-3">
                          {attempt.submission_time
                            ? new Date(attempt.submission_time).toLocaleString()
                            : attempt.submitted_at
                              ? new Date(attempt.submitted_at).toLocaleString()
                              : '-'}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge className="bg-amber-100 text-amber-800">Pending Review</Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => openReview(attempt)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAttempt && (
          <AssignmentReview
            attempt={selectedAttempt}
            score={score}
            maxMarks={maxMarks}
            setScore={setScore}
            setMaxMarks={setMaxMarks}
            feedback={feedback}
            setFeedback={setFeedback}
            onPublish={publishResult}
            isPublishing={publishing}
            validationMessage={validationMessage}
          />
        )}
      </main>
    </div>
  );
};

export default TeacherAssignmentReviewPage;
