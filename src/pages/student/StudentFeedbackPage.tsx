import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, CalendarDays, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabaseUrl } from '@/config/supabase';

interface ResultQuestionRow {
  question_id: string | number;
  question_index: number;
  question_text: string;
  question_type: string;
  options?: string[];
  student_selected_answer: string | number | null;
  correct_answer: string | number | null;
  is_correct: boolean;
}

interface ResultDetailResponse {
  assignment: {
    id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
  };
  attempt: {
    id: string;
    status: string;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    published_at?: string | null;
    feedback: string;
    achieved_marks: number;
    total_marks: number;
    percentage: number;
  };
  questions: ResultQuestionRow[];
  stats: {
    total_questions: number;
    correct_answers: number;
    incorrect_answers: number;
    achieved_marks: number;
    total_marks: number;
    percentage: number;
  };
}

const getStudentToken = () => {
  try {
    const sessionToken = sessionStorage.getItem('student_presigned_token');
    if (sessionToken) return sessionToken;
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem('student_presigned_token');
  } catch {
    return null;
  }
};

const normalizeAnswerText = (question: ResultQuestionRow, raw: string | number | null) => {
  if (raw === null || raw === undefined || raw === '') return 'Not answered';
  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length > 0) {
    if (typeof raw === 'number' && options[raw] !== undefined) {
      return `${String.fromCharCode(65 + raw)}. ${options[raw]}`;
    }
    if (/^-?\d+$/.test(String(raw)) && options[Number(raw)] !== undefined) {
      const idx = Number(raw);
      return `${String.fromCharCode(65 + idx)}. ${options[idx]}`;
    }
  }
  return String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Not answered';
};

const StudentFeedbackPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [resultDetail, setResultDetail] = useState<ResultDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResultDetail = async () => {
      if (!submissionId) {
        setError('Missing assignment identifier.');
        setLoading(false);
        return;
      }

      const token = getStudentToken();
      if (!token) {
        setError('Student session not found. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const supabaseUrl = getSupabaseUrl();
        const response = await fetch(
          `${supabaseUrl}/functions/v1/assignment-attempts?token=${encodeURIComponent(token)}&assignment_id=${encodeURIComponent(submissionId)}&action=result-detail`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const payload = await response.text();
          let message = 'Unable to load result.';
          try {
            const parsed = JSON.parse(payload);
            if (parsed?.error) message = parsed.error;
          } catch {
            if (payload) message = payload;
          }
          setError(message);
          setLoading(false);
          return;
        }

        const data = (await response.json()) as ResultDetailResponse;
        setResultDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };

    loadResultDetail();
  }, [submissionId]);

  const published = useMemo(
    () => resultDetail?.attempt?.status === 'completed',
    [resultDetail]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center text-sm text-gray-600">Loading detailed result...</CardContent>
        </Card>
      </div>
    );
  }

  if (error || !resultDetail) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => navigate('/student-portal')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Student Portal
          </Button>
          <Alert>
            <AlertDescription>
              {error || 'Result is not available yet.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <Button variant="ghost" onClick={() => navigate('/student-portal')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Student Portal
        </Button>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>{resultDetail.assignment.title}</CardTitle>
              <Badge className={published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {published ? 'Result Published' : 'Submitted - Waiting for Teacher Review'}
              </Badge>
            </div>
            {resultDetail.assignment.description && (
              <p className="text-sm text-gray-600">{resultDetail.assignment.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Published: {resultDetail.attempt.published_at ? new Date(resultDetail.attempt.published_at).toLocaleString() : '-'}
            </div>
            <div className="rounded-lg border bg-blue-50 p-3">
              <div className="text-sm text-blue-700">Final Score</div>
              <div className="text-2xl font-bold text-blue-900">
                {resultDetail.attempt.achieved_marks} / {resultDetail.attempt.total_marks}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">Teacher Feedback</div>
              <div className="text-sm text-gray-800">{resultDetail.attempt.feedback || 'No feedback provided.'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question-by-Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resultDetail.questions.length === 0 ? (
              <Alert>
                <AlertDescription>No detailed question data is available for this submission.</AlertDescription>
              </Alert>
            ) : (
              resultDetail.questions
                .sort((a, b) => a.question_index - b.question_index)
                .map((question) => {
                  const studentAnswerText = normalizeAnswerText(question, question.student_selected_answer);
                  const correctAnswerText = normalizeAnswerText(question, question.correct_answer);
                  return (
                    <div key={`${question.question_id}-${question.question_index}`} className="rounded-lg border p-3 space-y-2 bg-white">
                      <div className="font-medium text-sm">
                        Question {question.question_index + 1}
                      </div>
                      <div className="text-sm text-gray-800">{question.question_text}</div>

                      {Array.isArray(question.options) && question.options.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {question.options.map((option, idx) => {
                            const line = `${String.fromCharCode(65 + idx)}. ${option}`;
                            const isStudent = line === studentAnswerText;
                            const isCorrect = line === correctAnswerText;
                            return (
                              <div
                                key={`${question.question_id}-opt-${idx}`}
                                className={`rounded px-2 py-1 text-xs border ${
                                  isStudent
                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                    : isCorrect
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="text-xs text-gray-700">
                        <span className="font-medium">Student Answer:</span> {studentAnswerText}
                      </div>
                      <div className="text-xs text-gray-700">
                        <span className="font-medium">Correct Answer:</span> {correctAnswerText}
                      </div>
                      <div>
                        {question.is_correct ? (
                          <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 gap-1">
                            <XCircle className="h-3.5 w-3.5" />
                            Incorrect
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Result Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-lg border p-3 bg-slate-50">
                <div className="text-xs text-gray-600">Total Questions</div>
                <div className="text-lg font-semibold">{resultDetail.stats.total_questions}</div>
              </div>
              <div className="rounded-lg border p-3 bg-emerald-50">
                <div className="text-xs text-gray-600">Correct Answers</div>
                <div className="text-lg font-semibold">{resultDetail.stats.correct_answers}</div>
              </div>
              <div className="rounded-lg border p-3 bg-red-50">
                <div className="text-xs text-gray-600">Incorrect Answers</div>
                <div className="text-lg font-semibold">{resultDetail.stats.incorrect_answers}</div>
              </div>
              <div className="rounded-lg border p-3 bg-blue-50">
                <div className="text-xs text-gray-600">Final Score</div>
                <div className="text-lg font-semibold">
                  {resultDetail.stats.achieved_marks} / {resultDetail.stats.total_marks}
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-purple-50">
                <div className="text-xs text-gray-600">Score Percentage</div>
                <div className="text-lg font-semibold">{resultDetail.stats.percentage}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentFeedbackPage;
