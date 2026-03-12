import React, { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const sanitizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const getAnswerFromRecord = (answerRecord, question, idx) => {
  if (!answerRecord || typeof answerRecord !== 'object') return null;

  const fromIndex = answerRecord[idx] ?? answerRecord[String(idx)];
  const fromId = question?.id !== undefined
    ? (answerRecord[question.id] ?? answerRecord[String(question.id)])
    : undefined;

  return fromIndex ?? fromId ?? null;
};

const normalizeAnswers = (attempt) => {
  const submissionData = attempt?.submission_data || {};
  const fromAnswers = Array.isArray(submissionData?.answers)
    ? submissionData.answers
    : [];

  if (fromAnswers.length > 0) {
    return fromAnswers.map((row, idx) => ({
      question: String(row?.question || row?.question_text || `Question ${idx + 1}`),
      student_answer: row?.student_answer ?? row?.student_selected_answer ?? (typeof row === 'string' ? row : ''),
      correct_answer: row?.correct_answer ?? '',
      is_correct: Boolean(row?.is_correct),
    }));
  }

  const fromQuestionRows = Array.isArray(submissionData?.question_level_data)
    ? submissionData.question_level_data
    : [];

  if (fromQuestionRows.length > 0) {
    return fromQuestionRows.map((row, idx) => ({
      question: String(row?.question_text || `Question ${idx + 1}`),
      student_answer: row?.student_selected_answer ?? row?.student_answer ?? '',
      correct_answer: row?.correct_answer ?? '',
      is_correct: Boolean(row?.is_correct),
    }));
  }

  const resolvedQuestions = Array.isArray(attempt?.resolved_questions)
    ? attempt.resolved_questions
    : [];
  const answerRecord = submissionData?.answers;
  if (resolvedQuestions.length > 0 && answerRecord && typeof answerRecord === 'object') {
    return resolvedQuestions.map((question, idx) => {
      const answerValue = getAnswerFromRecord(answerRecord, question, idx);
      return {
        question: String(question?.text || `Question ${idx + 1}`),
        student_answer: answerValue ?? '',
        correct_answer: question?.correct_answer ?? '',
        is_correct: false,
      };
    });
  }

  const textResponse = sanitizeText(
    submissionData?.submission_text ??
    submissionData?.text ??
    submissionData?.response_text ??
    submissionData?.answer_text ??
    ''
  );

  if (textResponse) {
    return [{
      question: 'Student Response',
      student_answer: textResponse,
      correct_answer: '',
      is_correct: false,
    }];
  }

  return [];
};

const AssignmentReview = ({
  attempt,
  score,
  maxMarks,
  setScore,
  setMaxMarks,
  feedback,
  setFeedback,
  onPublish,
  isPublishing,
  validationMessage,
}) => {
  const answers = useMemo(() => normalizeAnswers(attempt), [attempt]);
  const numericScore = Number(score || 0);
  const numericMax = Number(maxMarks || 0);
  const percentage = numericMax > 0 ? Math.round((numericScore / numericMax) * 100) : 0;

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">Review Submission</h3>

      {answers.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No answer details found in this submission.
        </div>
      ) : (
        <div className="space-y-3">
          {answers.map((answer, idx) => (
            (() => {
              const hasCorrectAnswer = sanitizeText(answer.correct_answer).length > 0;
              const answerColor = hasCorrectAnswer
                ? (answer.is_correct ? 'green' : 'red')
                : '#334155';
              const answerBackground = hasCorrectAnswer
                ? (answer.is_correct ? '#e6ffe6' : '#ffe6e6')
                : '#f8fafc';
              const resultLabel = hasCorrectAnswer
                ? (answer.is_correct ? 'Correct' : 'Wrong')
                : 'Needs Teacher Review';

              return (
            <div
              key={`review-answer-${idx}`}
              className="question-card rounded-lg border p-3"
              style={{
                color: answerColor,
                background: answerBackground,
              }}
            >
              <p><b>Question:</b> {answer.question}</p>
              <p><b>Student Answer:</b> {String(answer.student_answer || 'Not answered')}</p>
              <p><b>Correct Answer:</b> {String(answer.correct_answer || '-')}</p>
              <p>Result: {resultLabel}</p>
            </div>
              );
            })()
          ))}
        </div>
      )}

      <div className="marks-container mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="marks-field flex flex-col gap-2">
          <Label htmlFor="teacher-review-score-obtained">Score Obtained</Label>
          <Input
            id="teacher-review-score-obtained"
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter obtained marks"
          />
        </div>

        <div className="marks-field flex flex-col gap-2">
          <Label htmlFor="teacher-review-maximum-marks">Maximum Marks</Label>
          <Input
            id="teacher-review-maximum-marks"
            type="number"
            min={1}
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            placeholder="Enter maximum marks"
          />
        </div>
      </div>

      <div className="score-preview rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
        Score: {score || 0} / {maxMarks || 0}
        <div className="text-xs font-medium text-slate-600 mt-1">Performance: {Number.isFinite(percentage) ? percentage : 0}%</div>
      </div>

      {validationMessage ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="teacher-review-feedback">Feedback for Student</Label>
        <Textarea
          id="teacher-review-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write feedback"
          className="min-h-[120px]"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={isPublishing} onClick={onPublish}>
          {isPublishing ? 'Publishing...' : 'Publish Result'}
        </Button>
      </div>
    </div>
  );
};

export default AssignmentReview;
