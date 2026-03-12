import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download, Eye, FileText, RefreshCw } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { LoadingState } from '@/components/LoadingState';
import { teacherReviewAPI } from '@/api/edgeClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ReviewDraft = {
  feedback: string;
  manualMarks: string;
  totalMarks: string;
};

const TeacherResultDeclarationPage = () => {
  const navigate = useNavigate();
  const { auth0UserId, isLoading: authLoading, isAuthenticated } = useAuth();

  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOverview, setReviewOverview] = useState<any[]>([]);
  const [showTeacherReviewDialog, setShowTeacherReviewDialog] = useState(false);
  const [selectedReviewAssignment, setSelectedReviewAssignment] = useState<any | null>(null);
  const [reviewSubmissions, setReviewSubmissions] = useState<any[]>([]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});

  const loadTeacherReviewOverview = useCallback(async () => {
    if (!auth0UserId) return;
    try {
      setReviewLoading(true);
      const data = await teacherReviewAPI.getOverview(auth0UserId);
      setReviewOverview(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load teacher review overview:', error);
      setReviewOverview([]);
      toast.error('Failed to load review queue');
    } finally {
      setReviewLoading(false);
    }
  }, [auth0UserId]);

  const getReviewStatusLabel = (status?: string) => {
    switch (status) {
      case 'not_started':
        return 'Not Attempted';
      case 'in_progress':
        return 'In Progress';
      case 'submitted':
        return 'Submitted - Waiting for Review';
      case 'completed':
        return 'Result Published';
      default:
        return status || 'Not Attempted';
    }
  };

  const getAnswerText = (question: any, rawAnswer: any) => {
    if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') return 'Not answered';
    if (question?.type === 'multiple-choice') {
      const options = Array.isArray(question?.options) ? question.options : [];
      if (typeof rawAnswer === 'number' && options[rawAnswer] !== undefined) {
        return `${String.fromCharCode(65 + rawAnswer)}. ${options[rawAnswer]}`;
      }
      if (/^-?\d+$/.test(String(rawAnswer)) && options[Number(rawAnswer)] !== undefined) {
        const idx = Number(rawAnswer);
        return `${String.fromCharCode(65 + idx)}. ${options[idx]}`;
      }
    }
    return String(rawAnswer).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Not answered';
  };

  const normalizeComparableAnswer = (value: any) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const evaluateIsCorrect = (question: any, studentAnswer: any) => {
    if (!question) return false;
    if (studentAnswer === null || studentAnswer === undefined || studentAnswer === '') return false;

    const correct = question?.correct_answer;
    if (question?.type === 'multiple-choice') {
      if (typeof correct === 'number') {
        if (typeof studentAnswer === 'number') return studentAnswer === correct;
        if (/^-?\d+$/.test(String(studentAnswer).trim())) {
          return Number(studentAnswer) === correct;
        }
        const opts = Array.isArray(question?.options) ? question.options : [];
        return normalizeComparableAnswer(studentAnswer) === normalizeComparableAnswer(opts[correct]);
      }
    }
    return normalizeComparableAnswer(studentAnswer) === normalizeComparableAnswer(correct);
  };

  const getCorrectAnswerText = (question: any) => {
    const correct = question?.correct_answer;
    if (question?.type === 'multiple-choice' && typeof correct === 'number' && Array.isArray(question?.options)) {
      const optionText = question.options[correct];
      return optionText !== undefined ? `${String.fromCharCode(65 + correct)}. ${optionText}` : `Option ${correct + 1}`;
    }
    if (correct === null || correct === undefined || correct === '') return 'Not configured';
    return String(correct);
  };

  const getSubmissionQuestionRows = (submission: any) => {
    const questionLevelData = Array.isArray(submission?.submission_data?.question_level_data)
      ? submission.submission_data.question_level_data
      : [];

    if (questionLevelData.length > 0) {
      return questionLevelData.map((row: any, idx: number) => {
        const questionIndex = Number(row?.question_index ?? idx);
        const question = {
          index: questionIndex,
          text: row?.question_text || `Question ${questionIndex + 1}`,
          type: row?.question_type || (Array.isArray(row?.options) ? 'multiple-choice' : 'subjective'),
          options: Array.isArray(row?.options) ? row.options : [],
          correct_answer: row?.correct_answer,
        };

        return {
          index: questionIndex,
          question,
          studentAnswerRaw: row?.student_selected_answer ?? row?.student_answer ?? null,
          studentAnswerText: getAnswerText(question, row?.student_selected_answer ?? row?.student_answer ?? null),
          correctAnswerText: getCorrectAnswerText(question),
          isCorrect: typeof row?.is_correct === 'boolean'
            ? row.is_correct
            : evaluateIsCorrect(question, row?.student_selected_answer ?? row?.student_answer ?? null),
        };
      });
    }

    const questions = Array.isArray(selectedReviewAssignment?.questions) && selectedReviewAssignment.questions.length > 0
      ? selectedReviewAssignment.questions
      : (Array.isArray(submission?.resolved_questions) ? submission.resolved_questions : []);
    const studentAnswers = submission?.submission_data?.answers || {};

    return questions.map((question: any, idx: number) => {
      const fromStudent =
        studentAnswers[idx] ??
        studentAnswers[String(idx)] ??
        (question?.id !== undefined ? studentAnswers[question.id] : undefined) ??
        (question?.id !== undefined ? studentAnswers[String(question.id)] : undefined) ??
        null;

      return {
        index: idx,
        question,
        studentAnswerRaw: fromStudent,
        studentAnswerText: getAnswerText(question, fromStudent),
        correctAnswerText: getCorrectAnswerText(question),
        isCorrect: evaluateIsCorrect(question, fromStudent),
      };
    });
  };

  const getResponseStats = (submission: any) => {
    const rows = getSubmissionQuestionRows(submission);
    if (rows.length === 0) {
      return {
        totalQuestions: 0,
        responsesCaptured: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      };
    }

    const responsesCaptured = rows.filter((row) => row.studentAnswerRaw !== null && row.studentAnswerRaw !== undefined && row.studentAnswerRaw !== '').length;
    const correctAnswers = rows.filter((row) => row.isCorrect).length;
    const totalQuestions = rows.length;
    const incorrectAnswers = Math.max(totalQuestions - correctAnswers, 0);

    return {
      totalQuestions,
      responsesCaptured,
      correctAnswers,
      incorrectAnswers,
    };
  };

  const getStoredMarks = (submission: any) => {
    const achieved = typeof submission?.submission_data?.teacher_review?.achieved_marks === 'number'
      ? submission.submission_data.teacher_review.achieved_marks
      : (typeof submission?.score === 'number' ? submission.score : 0);

    const total = typeof submission?.submission_data?.teacher_review?.total_marks === 'number'
      ? submission.submission_data.teacher_review.total_marks
      : (typeof submission?.max_score === 'number' ? submission.max_score : 0);

    return {
      achieved: Number.isFinite(achieved) ? achieved : 0,
      total: Number.isFinite(total) ? total : 0,
    };
  };

  const parseDraftNumber = (value?: string) => {
    if (!value || value.trim() === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const getDisplayedMarks = (submission: any) => {
    const draft = reviewDrafts[submission.id];
    const draftAchieved = parseDraftNumber(draft?.manualMarks);
    const draftTotal = parseDraftNumber(draft?.totalMarks);
    const stored = getStoredMarks(submission);
    const rows = getSubmissionQuestionRows(submission);
    const fallbackTotal = rows.length > 0
      ? rows.length
      : Number(submission?.submission_data?.total_questions || selectedReviewAssignment?.total_questions || 0);

    const total = draftTotal ?? stored.total ?? fallbackTotal;
    const achieved = draftAchieved ?? stored.achieved ?? 0;

    return {
      achieved: Number.isFinite(achieved) ? achieved : 0,
      total: Number.isFinite(total) ? total : 0,
      responseCount: rows.length,
    };
  };

  const openTeacherReviewDetails = async (reviewAssignment: any) => {
    if (!auth0UserId || !reviewAssignment?.assignment_id) return;
    try {
      const result = await teacherReviewAPI.getSubmissions(auth0UserId, reviewAssignment.assignment_id);
      const submissions = Array.isArray(result?.submissions) ? result.submissions : [];
      const drafts: Record<string, ReviewDraft> = {};

      submissions.forEach((row: any) => {
        const storedAchieved = typeof row?.submission_data?.teacher_review?.manual_assigned_marks === 'number'
          ? row.submission_data.teacher_review.manual_assigned_marks
          : (typeof row?.submission_data?.teacher_review?.achieved_marks === 'number' ? row.submission_data.teacher_review.achieved_marks : null);

        const fallbackTotal = Number(row?.submission_data?.total_questions || result?.assignment?.total_questions || 0);
        const storedTotal = typeof row?.submission_data?.teacher_review?.manual_total_marks === 'number'
          ? row.submission_data.teacher_review.manual_total_marks
          : (typeof row?.submission_data?.teacher_review?.total_marks === 'number'
            ? row.submission_data.teacher_review.total_marks
            : (Number.isFinite(fallbackTotal) && fallbackTotal > 0 ? fallbackTotal : null));

        drafts[row.id] = {
          feedback: row.feedback || '',
          manualMarks: typeof storedAchieved === 'number' ? String(storedAchieved) : '',
          totalMarks: typeof storedTotal === 'number' ? String(storedTotal) : '',
        };
      });

      setSelectedReviewAssignment({
        ...reviewAssignment,
        assignment_name: result?.assignment?.title || reviewAssignment.assignment_name,
        room_name: result?.assignment?.room_name || reviewAssignment.room_name,
        due_date: result?.assignment?.due_date || reviewAssignment.due_date,
        questions: Array.isArray(result?.assignment?.questions) ? result.assignment.questions : [],
        total_questions: result?.assignment?.total_questions || 0,
      });
      setReviewSubmissions(submissions);
      setReviewDrafts(drafts);
      setShowTeacherReviewDialog(true);
    } catch (error) {
      console.error('Failed to load review submissions:', error);
      toast.error('Failed to load submissions for review');
    }
  };

  const handleUpdateReviewSubmission = async (
    attemptId: string,
    action: 'completed'
  ) => {
    if (!auth0UserId) return;

    try {
      const submission = reviewSubmissions.find((item) => item.id === attemptId);
      const responseRows = submission ? getSubmissionQuestionRows(submission) : [];
      if (action === 'completed' && responseRows.length === 0) {
        console.error('Review blocked: submission has no question responses', { attemptId, submission });
        toast.error('Cannot finalize review: no question-response records were found for this submission.');
        return;
      }

      const draft = reviewDrafts[attemptId] || { feedback: '', manualMarks: '', totalMarks: '' };
      const manualMarks = parseDraftNumber(draft.manualMarks);
      const totalMarks = parseDraftNumber(draft.totalMarks);

      if (action === 'completed' && (manualMarks === null || totalMarks === null || totalMarks <= 0)) {
        toast.error('Enter both Final Marks and Marks Out Of before saving review or publishing result');
        return;
      }

      if (manualMarks !== null && totalMarks !== null && manualMarks > totalMarks) {
        toast.error('Final Marks cannot be greater than Marks Out Of');
        return;
      }

      const payload: any = {
        status: action,
        feedback: draft.feedback,
      };

      if (manualMarks !== null) {
        payload.manualMarks = manualMarks;
      }
      if (totalMarks !== null) {
        payload.totalMarks = totalMarks;
      }

      await teacherReviewAPI.updateSubmission(auth0UserId, attemptId, payload);

      toast.success('Result published to student portal');

      if (selectedReviewAssignment?.assignment_id) {
        await openTeacherReviewDetails(selectedReviewAssignment);
      }
      await loadTeacherReviewOverview();
    } catch (error) {
      console.error('Failed to update review submission:', error);
      toast.error('Failed to update submission review status');
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !auth0UserId) {
      return;
    }
    loadTeacherReviewOverview();
  }, [authLoading, isAuthenticated, auth0UserId, loadTeacherReviewOverview]);

  const reviewQueue = useMemo(
    () => reviewOverview.filter((item) => (item?.submissions_count || 0) > 0),
    [reviewOverview]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 pt-28 sm:pt-32">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/assignments')}
          className="mb-4 hover:bg-purple-50 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assignments
        </Button>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Result Declaration</h1>
            <p className="text-sm text-muted-foreground">
              Review student answers and assign final marks manually before publishing results.
            </p>
          </div>
          <Button variant="outline" onClick={loadTeacherReviewOverview}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Queue
          </Button>
        </div>

        <section className="space-y-4">
          {reviewLoading ? (
            <LoadingState type="assignments" count={4} />
          ) : reviewQueue.length === 0 ? (
            <div className="text-center py-10 border rounded-xl bg-white/70">
              <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-base font-medium text-gray-700">No submitted assignments waiting for review</p>
              <p className="text-sm text-muted-foreground">Students submit from the student portal. Their responses appear here for manual evaluation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {reviewQueue.map((item) => (
                <Card key={item.assignment_id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{item.assignment_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{item.room_name}</p>
                      </div>
                      <Badge className={item.is_ready_for_review ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                        {item.is_ready_for_review ? 'Ready for Review' : 'Due Date Pending'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-600">Due: {item.due_date ? new Date(item.due_date).toLocaleString() : 'No due date'}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="rounded-md border p-2 bg-slate-50">
                        <div className="text-xs text-muted-foreground">Students</div>
                        <div className="font-semibold">{item.total_students}</div>
                      </div>
                      <div className="rounded-md border p-2 bg-blue-50">
                        <div className="text-xs text-muted-foreground">Submissions</div>
                        <div className="font-semibold">{item.submissions_count}</div>
                      </div>
                      <div className="rounded-md border p-2 bg-orange-50">
                        <div className="text-xs text-muted-foreground">Pending Review</div>
                        <div className="font-semibold">{item.pending_reviews_count}</div>
                      </div>
                      <div className="rounded-md border p-2 bg-green-50">
                        <div className="text-xs text-muted-foreground">Published</div>
                        <div className="font-semibold">{item.published_count}</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => navigate(`/teacher/assignment-review/${item.assignment_id}`)}>
                        Open Review Page
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={showTeacherReviewDialog} onOpenChange={setShowTeacherReviewDialog}>
        <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Teacher Review: {selectedReviewAssignment?.assignment_name || 'Assignment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Room:</span> {selectedReviewAssignment?.room_name || 'All Classes'}
              {'  '}
              <span className="font-medium">Due:</span>{' '}
              {selectedReviewAssignment?.due_date ? new Date(selectedReviewAssignment.due_date).toLocaleString() : 'No due date'}
            </div>

            {reviewSubmissions.length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-gray-500">
                No student submissions available for review yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewSubmissions.map((submission) => {
                  const rows = getSubmissionQuestionRows(submission);
                  const stats = getResponseStats(submission);
                  const hasResponseData = rows.length > 0;
                  const reportPdfUrl = submission?.submission_data?.report_pdf_url || null;
                  const reportPdfPath = submission?.submission_data?.report_pdf_path || null;
                  const reportPdfError = submission?.submission_data?.report_pdf_error || null;

                  return (
                    <Card key={submission.id} className="border">
                      <CardContent className="p-4 space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student Information</div>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <div className="font-semibold">{submission.students?.name || 'Student'}</div>
                            <div className="text-xs text-muted-foreground">{submission.students?.email || '-'}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Submitted: {submission.submission_time ? new Date(submission.submission_time).toLocaleString() : '-'}
                            </div>
                          </div>
                          <Badge variant="outline">{getReviewStatusLabel(submission.status)}</Badge>
                        </div>

                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assignment Summary</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded-md border bg-slate-50 p-2 text-sm">
                            <div className="text-xs text-muted-foreground">Total Questions</div>
                            <div className="font-semibold">{hasResponseData ? stats.totalQuestions : 'N/A'}</div>
                          </div>
                          <div className="rounded-md border bg-emerald-50 p-2 text-sm">
                            <div className="text-xs text-muted-foreground">Correct Answers</div>
                            <div className="font-semibold">{hasResponseData ? stats.correctAnswers : 'N/A'}</div>
                          </div>
                          <div className="rounded-md border bg-red-50 p-2 text-sm">
                            <div className="text-xs text-muted-foreground">Incorrect Answers</div>
                            <div className="font-semibold">{hasResponseData ? stats.incorrectAnswers : 'N/A'}</div>
                          </div>
                          <div className="rounded-md border bg-purple-50 p-2 text-sm">
                            <div className="text-xs text-muted-foreground">Responses Captured</div>
                            <div className="font-semibold">{hasResponseData ? stats.responsesCaptured : 'N/A'}</div>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-gray-700">
                            Open the generated assignment report PDF to review question-wise details, student answers, and correct answers.
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!reportPdfUrl}
                              onClick={() => {
                                if (reportPdfUrl) {
                                  window.open(reportPdfUrl, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Assignment Report (PDF)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!reportPdfUrl}
                              onClick={() => {
                                if (reportPdfUrl) {
                                  window.open(reportPdfUrl, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </Button>
                          </div>
                        </div>

                        {!reportPdfUrl && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            Assignment report PDF is not available yet for this submission.
                            {reportPdfPath ? ' Please refresh once generation completes.' : ' It may be from an older submission before PDF generation was enabled.'}
                            {reportPdfError ? ` Error: ${reportPdfError}` : ''}
                          </div>
                        )}

                        {!hasResponseData && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            Missing response data for this submission. Review is blocked until student responses are available.
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`review-manual-marks-${submission.id}`}>Final Marks Awarded</Label>
                            <Input
                              id={`review-manual-marks-${submission.id}`}
                              type="number"
                              min={0}
                              value={reviewDrafts[submission.id]?.manualMarks || ''}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [submission.id]: {
                                    feedback: prev[submission.id]?.feedback || '',
                                    manualMarks: e.target.value,
                                    totalMarks: prev[submission.id]?.totalMarks || '',
                                  },
                                }))
                              }
                              placeholder="Enter final marks"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`review-total-marks-${submission.id}`}>Marks Out Of</Label>
                            <Input
                              id={`review-total-marks-${submission.id}`}
                              type="number"
                              min={1}
                              value={reviewDrafts[submission.id]?.totalMarks || ''}
                              onChange={(e) =>
                                setReviewDrafts((prev) => ({
                                  ...prev,
                                  [submission.id]: {
                                    feedback: prev[submission.id]?.feedback || '',
                                    manualMarks: prev[submission.id]?.manualMarks || '',
                                    totalMarks: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Enter total marks"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Feedback Section</div>
                          <Label htmlFor={`review-feedback-${submission.id}`}>Student Feedback</Label>
                          <Textarea
                            id={`review-feedback-${submission.id}`}
                            value={reviewDrafts[submission.id]?.feedback || ''}
                            onChange={(e) =>
                              setReviewDrafts((prev) => ({
                                ...prev,
                                [submission.id]: {
                                  feedback: e.target.value,
                                  manualMarks: prev[submission.id]?.manualMarks || '',
                                  totalMarks: prev[submission.id]?.totalMarks || '',
                                },
                              }))
                            }
                            placeholder="Write remarks for the student based on performance"
                            className="min-h-[84px]"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          <div className="w-full text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">Actions</div>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateReviewSubmission(submission.id, 'completed')}
                          >
                            Publish Result
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherResultDeclarationPage;
