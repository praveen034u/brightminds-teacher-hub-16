import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const ASSIGNMENT_REPORT_BUCKET = 'assignment-reports';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const getErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message || 'Unknown error';

    const code = error?.code ? String(error.code) : '';
    const message = error?.message ? String(error.message) : '';
    const details = error?.details ? String(error.details) : '';
    const hint = error?.hint ? String(error.hint) : '';

    const parts = [
      code ? `[${code}]` : '',
      message,
      details ? `Details: ${details}` : '',
      hint ? `Hint: ${hint}` : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const auth0UserId = url.searchParams.get('auth0_user_id');
    const token = url.searchParams.get('token') || req.headers.get('authorization')?.replace('Bearer ', '');
    const assignmentId = url.searchParams.get('assignment_id');
    const action = url.searchParams.get('action');
    const attemptId = url.searchParams.get('attempt_id');

    const teacherActions = new Set(['review-overview', 'review-list', 'review-update', 'publish-result']);

    const safeText = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const formatTimestamp = (iso: string): string => {
      try {
        return new Date(iso).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch {
        return iso;
      }
    };

    const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
      const normalized = safeText(text) || '-';
      const words = normalized.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          currentLine = candidate;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }

          if (font.widthOfTextAtSize(word, size) > maxWidth) {
            let chunk = '';
            for (const ch of word) {
              const chunkCandidate = `${chunk}${ch}`;
              if (font.widthOfTextAtSize(chunkCandidate, size) <= maxWidth) {
                chunk = chunkCandidate;
              } else {
                if (chunk) lines.push(chunk);
                chunk = ch;
              }
            }
            currentLine = chunk;
          } else {
            currentLine = word;
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines.length > 0 ? lines : ['-'];
    };

    const ensureReportBucket = async () => {
      const { data: existingBucket, error: bucketCheckError } = await supabase.storage.getBucket(ASSIGNMENT_REPORT_BUCKET);
      if (existingBucket) return;

      if (bucketCheckError) {
        const message = String(bucketCheckError?.message || '').toLowerCase();
        const missingBucket = message.includes('not found') || message.includes('does not exist');
        if (!missingBucket) {
          throw bucketCheckError;
        }
      }

      const { error: createBucketError } = await supabase.storage.createBucket(ASSIGNMENT_REPORT_BUCKET, {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['application/pdf'],
      });

      if (createBucketError && !String(createBucketError?.message || '').toLowerCase().includes('already exists')) {
        throw createBucketError;
      }
    };

    const generateAssignmentReportPdf = async (params: {
      assignmentTitle: string;
      subject: string;
      roomName: string;
      assignmentType?: string;
      studentName: string;
      studentId: string;
      submittedAt: string;
      questionRows: any[];
      submissionMeta?: Record<string, any>;
    }): Promise<Uint8Array> => {
      const pdfDoc = await PDFDocument.create();
      const pageSize: [number, number] = [595.28, 841.89]; // A4
      let page = pdfDoc.addPage(pageSize);
      const width = page.getWidth();
      const height = page.getHeight();
      const margin = 40;
      const contentWidth = width - margin * 2;
      const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const lineHeight = 14;
      const smallLineHeight = 12;
      let cursorY = height - margin;

      const ensureSpace = (requiredHeight: number) => {
        if (cursorY - requiredHeight < margin) {
          page = pdfDoc.addPage(pageSize);
          cursorY = height - margin;
        }
      };

      const drawTextLine = (text: string, font: any, size: number, color = rgb(0.1, 0.1, 0.1)) => {
        page.drawText(text, { x: margin, y: cursorY, size, font, color });
        cursorY -= Math.max(lineHeight, size + 4);
      };

      const drawWrappedBlock = (
        label: string,
        value: string,
        options?: { fontSize?: number; bgColor?: any; borderColor?: any; textColor?: any }
      ) => {
        const fontSize = options?.fontSize ?? 10;
        const lines = wrapText(value, bodyFont, fontSize, contentWidth - 12);
        const blockHeight = 8 + lines.length * smallLineHeight + 8;
        ensureSpace(blockHeight + 18);

        page.drawText(label, {
          x: margin,
          y: cursorY,
          size: 10,
          font: titleFont,
          color: rgb(0.15, 0.15, 0.2),
        });
        cursorY -= 14;

        if (options?.bgColor) {
          page.drawRectangle({
            x: margin,
            y: cursorY - blockHeight + 4,
            width: contentWidth,
            height: blockHeight,
            color: options.bgColor,
            borderColor: options.borderColor || rgb(0.82, 0.82, 0.86),
            borderWidth: 0.8,
          });
        }

        let blockY = cursorY - 10;
        for (const line of lines) {
          page.drawText(line, {
            x: margin + 6,
            y: blockY,
            size: fontSize,
            font: bodyFont,
            color: options?.textColor || rgb(0.18, 0.18, 0.22),
          });
          blockY -= smallLineHeight;
        }

        cursorY -= blockHeight + 6;
      };

      page.drawText('Assignment Submission Report', {
        x: margin,
        y: cursorY,
        size: 18,
        font: titleFont,
        color: rgb(0.09, 0.09, 0.12),
      });
      cursorY -= 28;

      drawTextLine(`Assignment Title: ${safeText(params.assignmentTitle) || '-'}`, bodyFont, 10);
      drawTextLine(`Subject: ${safeText(params.subject) || 'N/A'}`, bodyFont, 10);
      drawTextLine(`Assignment Type: ${safeText(params.assignmentType) || 'N/A'}`, bodyFont, 10);
      drawTextLine(`Room / Class Name: ${safeText(params.roomName) || 'N/A'}`, bodyFont, 10);
      drawTextLine(`Student Name: ${safeText(params.studentName) || '-'}`, bodyFont, 10);
      drawTextLine(`Student ID: ${safeText(params.studentId) || '-'}`, bodyFont, 10);
      drawTextLine(`Submission Date & Time: ${formatTimestamp(params.submittedAt)}`, bodyFont, 10);

      if (typeof params?.submissionMeta?.auto_game_score === 'number') {
        drawTextLine(`Auto Game Score: ${Math.round(params.submissionMeta.auto_game_score)}%`, bodyFont, 10);
      }

      if (params?.submissionMeta?.gameType) {
        drawTextLine(`Game Type: ${safeText(params.submissionMeta.gameType)}`, bodyFont, 10);
      }

      if (params?.submissionMeta?.difficulty) {
        drawTextLine(`Difficulty: ${safeText(params.submissionMeta.difficulty)}`, bodyFont, 10);
      }

      if (params?.submissionMeta?.category) {
        drawTextLine(`Category: ${safeText(params.submissionMeta.category)}`, bodyFont, 10);
      }

      cursorY -= 4;

      const questionRows = Array.isArray(params.questionRows)
        ? [...params.questionRows].sort((a: any, b: any) => Number(a.question_index ?? 0) - Number(b.question_index ?? 0))
        : [];

      for (let index = 0; index < questionRows.length; index += 1) {
        const row = questionRows[index] || {};
        const questionNumber = Number(row?.question_index ?? index) + 1;
        const questionText = safeText(row?.question_text || `Question ${questionNumber}`);
        const questionType = safeText(row?.question_type || '');
        const studentAnswer = safeText(row?.student_selected_answer ?? row?.student_answer ?? 'Not answered');
        const hasCorrectAnswer = row?.correct_answer !== null && row?.correct_answer !== undefined && safeText(row?.correct_answer) !== '';
        const correctAnswer = hasCorrectAnswer
          ? safeText(row?.correct_answer)
          : (questionType === 'game'
            ? 'No fixed correct answer for this game. Teacher should evaluate based on performance.'
            : 'No fixed correct answer configured. Teacher review required.');
        const isAutoGradable = hasCorrectAnswer && questionType !== 'game';
        const isCorrect = isAutoGradable ? row?.is_correct === true : null;
        const studentAnswerBgColor = isAutoGradable
          ? (isCorrect ? rgb(0.9, 0.97, 0.92) : rgb(0.99, 0.92, 0.92))
          : rgb(0.95, 0.96, 0.99);
        const studentAnswerBorderColor = isAutoGradable
          ? (isCorrect ? rgb(0.62, 0.84, 0.67) : rgb(0.93, 0.63, 0.63))
          : rgb(0.74, 0.78, 0.9);
        const studentAnswerTextColor = isAutoGradable
          ? (isCorrect ? rgb(0.1, 0.35, 0.12) : rgb(0.52, 0.12, 0.12))
          : rgb(0.2, 0.23, 0.39);
        const resultLabel = isAutoGradable
          ? (isCorrect ? 'Correct' : 'Incorrect')
          : 'Needs Teacher Review';
        const resultColor = isAutoGradable
          ? (isCorrect ? rgb(0.1, 0.42, 0.15) : rgb(0.62, 0.16, 0.16))
          : rgb(0.59, 0.36, 0.07);

        ensureSpace(120);
        page.drawText(`Question ${questionNumber}`, {
          x: margin,
          y: cursorY,
          size: 12,
          font: titleFont,
          color: rgb(0.11, 0.11, 0.15),
        });
        cursorY -= 16;

        drawWrappedBlock('Question Text', questionText, { fontSize: 10 });
        drawWrappedBlock('Question Type', questionType || 'N/A', { fontSize: 10 });
        drawWrappedBlock("Student's Answer", studentAnswer, {
          fontSize: 10,
          bgColor: studentAnswerBgColor,
          borderColor: studentAnswerBorderColor,
          textColor: studentAnswerTextColor,
        });
        drawWrappedBlock('Correct Answer', correctAnswer, { fontSize: 10 });

        page.drawText(`Result: ${resultLabel}`, {
          x: margin,
          y: cursorY,
          size: 10,
          font: titleFont,
          color: resultColor,
        });
        cursorY -= 20;
      }

      if (questionRows.length === 0) {
        drawTextLine('No question-level response data was available for this submission.', bodyFont, 10, rgb(0.62, 0.16, 0.16));
      }

      return await pdfDoc.save();
    };

    const isMissingAssignmentResponsesTableError = (error: any): boolean => {
      const code = String(error?.code || '').toUpperCase();
      const message = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const hint = String(error?.hint || '').toLowerCase();
      return (
        code === '42P01' ||
        message.includes('assignment_responses') ||
        details.includes('assignment_responses') ||
        hint.includes('assignment_responses')
      );
    };

    const normalizeQuestions = (questions: any): any[] => {
      if (!Array.isArray(questions)) return [];
      return questions.map((q: any, idx: number) => ({
        id: q?.id ?? idx,
        index: idx,
        text: q?.text || q?.question || `Question ${idx + 1}`,
        type: q?.type || (Array.isArray(q?.options) ? 'multiple-choice' : 'subjective'),
        options: Array.isArray(q?.options) ? q.options : [],
        correct_answer: q?.answer,
        marks: 1,
      }));
    };

    const normalizeStudentAnswer = (raw: any): string => {
      if (raw === null || raw === undefined) return '';
      return String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const compareAnswer = (question: any, answer: any): boolean => {
      if (!question) return false;
      if (answer === null || answer === undefined || answer === '') return false;

      const correct = question.correct_answer;
      if (question.type === 'multiple-choice') {
        if (typeof correct === 'number') {
          if (typeof answer === 'number') return answer === correct;
          if (/^-?\d+$/.test(String(answer).trim())) {
            return Number(answer) === correct;
          }
          const opts = Array.isArray(question.options) ? question.options : [];
          return opts[correct] && normalizeStudentAnswer(opts[correct]).toLowerCase() === normalizeStudentAnswer(answer).toLowerCase();
        }
        if (typeof correct === 'string') {
          return normalizeStudentAnswer(correct).toLowerCase() === normalizeStudentAnswer(answer).toLowerCase();
        }
        return false;
      }

      if (typeof correct === 'string' && correct.trim()) {
        return normalizeStudentAnswer(correct).toLowerCase() === normalizeStudentAnswer(answer).toLowerCase();
      }
      return false;
    };

    const normalizeQuestionLevelData = (rows: any, assignmentIdForRow: string, studentIdForRow: string): any[] => {
      if (!Array.isArray(rows)) return [];
      return rows
        .map((row: any, idx: number) => {
          const questionIndex = Number(row?.question_index ?? row?.questionIndex ?? idx);
          const questionId = row?.question_id ?? row?.questionId ?? questionIndex;
          const options = Array.isArray(row?.options) ? row.options : [];
          const studentAnswer = row?.student_selected_answer ?? row?.student_answer ?? row?.studentAnswer ?? null;
          const correctAnswer = row?.correct_answer ?? row?.correctAnswer ?? null;
          const questionText = row?.question_text ?? row?.questionText ?? `Question ${questionIndex + 1}`;
          const type = row?.question_type ?? row?.type ?? (options.length > 0 ? 'multiple-choice' : 'subjective');

          const fallbackQuestion = {
            index: questionIndex,
            type,
            options,
            correct_answer: correctAnswer,
          };

          const isCorrect = typeof row?.is_correct === 'boolean'
            ? row.is_correct
            : compareAnswer(fallbackQuestion, studentAnswer);

          return {
            assignment_id: assignmentIdForRow,
            student_id: studentIdForRow,
            question_id: questionId,
            question_index: questionIndex,
            question_text: questionText,
            question_type: type,
            options,
            student_selected_answer: studentAnswer,
            correct_answer: correctAnswer,
            is_correct: Boolean(isCorrect),
          };
        })
        .filter((row: any) => Number.isFinite(row.question_index))
        .sort((a: any, b: any) => a.question_index - b.question_index);
    };

    const buildQuestionLevelDataFromQuestions = (
      assignmentIdForRow: string,
      studentIdForRow: string,
      questions: any[],
      answers: Record<string, any> | undefined
    ): any[] => {
      const safeAnswers = answers || {};
      return questions.map((question: any, idx: number) => {
        const answerFromIndex = safeAnswers[idx] ?? safeAnswers[String(idx)];
        const answerFromId = question?.id !== undefined
          ? (safeAnswers[question.id] ?? safeAnswers[String(question.id)])
          : undefined;
        const studentAnswer = answerFromIndex ?? answerFromId ?? null;

        return {
          assignment_id: assignmentIdForRow,
          student_id: studentIdForRow,
          question_id: question?.id ?? idx,
          question_index: Number(question?.index ?? idx),
          question_text: question?.text || `Question ${idx + 1}`,
          question_type: question?.type || (Array.isArray(question?.options) ? 'multiple-choice' : 'subjective'),
          options: Array.isArray(question?.options) ? question.options : [],
          student_selected_answer: studentAnswer,
          correct_answer: question?.correct_answer,
          is_correct: compareAnswer(question, studentAnswer),
        };
      });
    };

    const buildQuestionLevelDataFromLooseAnswers = (
      assignmentIdForRow: string,
      studentIdForRow: string,
      answers: any
    ): any[] => {
      if (Array.isArray(answers)) {
        return answers
          .map((rawAnswer: any, idx: number) => ({
            assignment_id: assignmentIdForRow,
            student_id: studentIdForRow,
            question_id: idx,
            question_index: idx,
            question_text: `Question ${idx + 1}`,
            question_type: 'subjective',
            options: [],
            student_selected_answer: rawAnswer,
            correct_answer: null,
            is_correct: false,
          }))
          .filter((row: any) => row.student_selected_answer !== null && row.student_selected_answer !== undefined && safeText(row.student_selected_answer) !== '');
      }

      if (answers && typeof answers === 'object') {
        const rows = Object.entries(answers)
          .map(([key, rawAnswer]: [string, any]) => {
            const numericIndex = Number(key);
            const questionIndex = Number.isFinite(numericIndex) ? numericIndex : null;
            return {
              assignment_id: assignmentIdForRow,
              student_id: studentIdForRow,
              question_id: key,
              question_index: questionIndex,
              question_text: questionIndex !== null ? `Question ${questionIndex + 1}` : `Question ${key}`,
              question_type: 'subjective',
              options: [],
              student_selected_answer: rawAnswer,
              correct_answer: null,
              is_correct: false,
            };
          })
          .filter((row: any) => row.student_selected_answer !== null && row.student_selected_answer !== undefined && safeText(row.student_selected_answer) !== '');

        const sortableRows = rows.map((row: any, idx: number) => ({
          ...row,
          question_index: Number.isFinite(row.question_index) ? row.question_index : (idx + 1000),
        }));

        return sortableRows.sort((a: any, b: any) => a.question_index - b.question_index);
      }

      return [];
    };

    const buildQuestionsFromQuestionLevelData = (rows: any[]): any[] => {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const grouped = new Map<number, any>();
      rows.forEach((row: any, idx: number) => {
        const index = Number(row?.question_index ?? row?.questionIndex ?? idx);
        if (!Number.isFinite(index)) return;
        if (grouped.has(index)) return;
        grouped.set(index, {
          id: row?.question_id ?? row?.questionId ?? index,
          index,
          text: row?.question_text || row?.questionText || `Question ${index + 1}`,
          type: row?.question_type || row?.type || (Array.isArray(row?.options) ? 'multiple-choice' : 'subjective'),
          options: Array.isArray(row?.options) ? row.options : [],
          correct_answer: row?.correct_answer ?? row?.correctAnswer ?? null,
          marks: 1,
        });
      });
      return Array.from(grouped.values()).sort((a, b) => a.index - b.index);
    };

    const buildAutoFeedback = (achieved: number, total: number): string => {
      if (total <= 0) return 'Good effort. Keep practicing to improve.';
      const percentage = (achieved / total) * 100;
      if (percentage >= 90) return 'Excellent work! Keep it up.';
      if (percentage >= 75) return "Great job! You're doing very well.";
      if (percentage >= 60) return 'Good effort. Keep practicing to improve.';
      if (percentage >= 40) return 'You are improving. Review your mistakes and try again.';
      return 'Needs improvement. Revise the topic and practice more.';
    };

    const loadAssignmentResponses = async (assignmentIdForQuery: string, studentIds: string[]) => {
      if (!assignmentIdForQuery || studentIds.length === 0) {
        return new Map<string, any[]>();
      }

      const { data: responseRows, error: responseError } = await supabase
        .from('assignment_responses')
        .select(`
          id,
          assignment_id,
          student_id,
          question_id,
          question_index,
          question_text,
          question_type,
          options,
          student_answer,
          correct_answer,
          is_correct,
          submitted_at,
          created_at
        `)
        .eq('assignment_id', assignmentIdForQuery)
        .in('student_id', studentIds)
        .order('question_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (responseError) {
        if (isMissingAssignmentResponsesTableError(responseError)) {
          throw new Error('assignment_responses table is missing. Run CREATE-ASSIGNMENT-RESPONSES-TABLE.sql in Supabase SQL Editor.');
        }
        throw responseError;
      }

      const grouped = new Map<string, any[]>();
      const latestByStudentQuestion = new Map<string, any>();
      (responseRows || []).forEach((row: any) => {
        const uniqueKey = `${row.student_id}::${row.question_id ?? row.question_index}`;
        if (!latestByStudentQuestion.has(uniqueKey)) {
          latestByStudentQuestion.set(uniqueKey, row);
        }
      });

      latestByStudentQuestion.forEach((row: any) => {
        const list = grouped.get(row.student_id) || [];
        list.push(row);
        grouped.set(row.student_id, list);
      });

      grouped.forEach((rows: any[], studentId: string) => {
        grouped.set(studentId, rows.sort((a: any, b: any) => Number(a.question_index ?? 0) - Number(b.question_index ?? 0)));
      });

      return grouped;
    };

    const storeAssignmentResponses = async (
      assignmentIdForRow: string,
      studentIdForRow: string,
      questionRows: any[],
      submittedAt: string
    ) => {
      const normalizedRows = normalizeQuestionLevelData(questionRows, assignmentIdForRow, studentIdForRow);
      if (normalizedRows.length === 0) {
        throw new Error('Question responses are missing. Submission cannot be saved.');
      }

      const { error: deleteError } = await supabase
        .from('assignment_responses')
        .delete()
        .eq('assignment_id', assignmentIdForRow)
        .eq('student_id', studentIdForRow);

      if (deleteError) {
        throw deleteError;
      }

      const payload = normalizedRows.map((row: any) => ({
        assignment_id: assignmentIdForRow,
        student_id: studentIdForRow,
        question_id: row.question_id,
        question_index: row.question_index,
        question_text: row.question_text,
        question_type: row.question_type,
        options: Array.isArray(row.options) ? row.options : [],
        student_answer: row.student_selected_answer,
        correct_answer: row.correct_answer,
        is_correct: Boolean(row.is_correct),
        submitted_at: submittedAt,
        created_at: submittedAt,
      }));

      const { error: insertError } = await supabase
        .from('assignment_responses')
        .insert(payload);

      if (insertError) {
        throw insertError;
      }
    };

    if (auth0UserId && action && teacherActions.has(action)) {
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('auth0_user_id', auth0UserId)
        .single();

      if (teacherError || !teacher) {
        return new Response(JSON.stringify({ error: 'Teacher not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const teacherId = teacher.id;

      if (req.method === 'GET' && action === 'review-overview') {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            room_id,
            rooms (
              id,
              name
            )
          `)
          .eq('teacher_id', teacherId)
          .eq('status', 'active');

        if (assignmentsError) throw assignmentsError;

        const assignmentIds = (assignments || []).map((a: any) => a.id);
        const roomIds = Array.from(
          new Set(
            (assignments || [])
              .map((a: any) => a.room_id)
              .filter((id: string | null | undefined): id is string => Boolean(id))
          )
        );

        const { data: teacherStudents, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('teacher_id', teacherId);

        if (studentsError) throw studentsError;
        const totalTeacherStudents = (teacherStudents || []).length;

        let roomStudentCounts = new Map<string, number>();
        if (roomIds.length > 0) {
          const { data: roomStudents, error: roomStudentsError } = await supabase
            .from('room_students')
            .select('room_id, student_id')
            .in('room_id', roomIds);

          if (roomStudentsError) throw roomStudentsError;

          roomStudentCounts = (roomStudents || []).reduce((acc: Map<string, number>, row: any) => {
            acc.set(row.room_id, (acc.get(row.room_id) || 0) + 1);
            return acc;
          }, new Map<string, number>());
        }

        let attemptsByAssignment = new Map<string, any[]>();
        if (assignmentIds.length > 0) {
          const { data: attempts, error: attemptsError } = await supabase
            .from('assignment_attempts')
            .select('assignment_id, status')
            .in('assignment_id', assignmentIds);

          if (attemptsError) throw attemptsError;

          attemptsByAssignment = (attempts || []).reduce((acc: Map<string, any[]>, row: any) => {
            const list = acc.get(row.assignment_id) || [];
            list.push(row);
            acc.set(row.assignment_id, list);
            return acc;
          }, new Map<string, any[]>());
        }

        const reviewOverview = (assignments || [])
          .map((assignment: any) => {
            const attempts = attemptsByAssignment.get(assignment.id) || [];
            const submissions = attempts.filter((a) =>
              ['submitted', 'completed'].includes(a.status)
            );
            const pendingReviews = attempts.filter((a) =>
              a.status === 'submitted'
            );

            const totalStudents = assignment.room_id
              ? (roomStudentCounts.get(assignment.room_id) || 0)
              : totalTeacherStudents;

            const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
            const isReadyForReview = Boolean(dueDate && dueDate.getTime() <= Date.now());

            return {
              assignment_id: assignment.id,
              assignment_name: assignment.title,
              room_id: assignment.room_id || null,
              room_name: assignment.rooms?.name || 'All Classes',
              due_date: assignment.due_date,
              total_students: totalStudents,
              submissions_count: submissions.length,
              pending_reviews_count: pendingReviews.length,
              reviewed_count: 0,
              published_count: attempts.filter((a) => a.status === 'completed').length,
              is_ready_for_review: isReadyForReview,
            };
          })
          .sort((a: any, b: any) => {
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          });

        return new Response(JSON.stringify(reviewOverview), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'GET' && action === 'review-list' && assignmentId) {
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            room_id,
            assignment_type,
            question_paper_id,
            game_config,
            rooms (
              id,
              name
            )
          `)
          .eq('id', assignmentId)
          .eq('teacher_id', teacherId)
          .single();

        if (assignmentError || !assignment) {
          return new Response(JSON.stringify({ error: 'Assignment not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: attempts, error: attemptsError } = await supabase
          .from('assignment_attempts')
          .select(`
            id,
            assignment_id,
            student_id,
            status,
            score,
            max_score,
            submitted_at,
            completed_at,
            attempts_count,
            feedback,
            submission_data,
            updated_at,
            students (
              id,
              name,
              email
            )
          `)
          .eq('assignment_id', assignmentId)
          .in('status', ['submitted', 'completed'])
          .order('submitted_at', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false });

        if (attemptsError) throw attemptsError;

        const studentIds = Array.from(new Set((attempts || []).map((attempt: any) => attempt.student_id).filter(Boolean)));
        let responsesByStudent = new Map<string, any[]>();
        let responseTableAvailable = true;
        try {
          responsesByStudent = await loadAssignmentResponses(assignmentId, studentIds as string[]);
        } catch (loadResponsesError) {
          if (isMissingAssignmentResponsesTableError(loadResponsesError)) {
            responseTableAvailable = false;
            console.warn('assignment_responses table missing while loading review-list', {
              assignmentId,
              error: loadResponsesError,
            });
          } else {
            throw loadResponsesError;
          }
        }

        const paperIds = new Set<string>();
        if (assignment.question_paper_id) {
          paperIds.add(String(assignment.question_paper_id));
        }
        (attempts || []).forEach((attempt: any) => {
          const attemptPaperId = attempt?.submission_data?.question_paper_id;
          if (attemptPaperId) {
            paperIds.add(String(attemptPaperId));
          }
        });

        const paperIdList = Array.from(paperIds);
        let papersById = new Map<string, any>();
        if (paperIdList.length > 0) {
          const { data: papers, error: papersError } = await supabase
            .from('question_papers')
            .select('id, title, questions')
            .in('id', paperIdList);
          if (!papersError && Array.isArray(papers)) {
            papersById = papers.reduce((acc: Map<string, any>, paper: any) => {
              acc.set(String(paper.id), paper);
              return acc;
            }, new Map<string, any>());
          }
        }

        let assignmentQuestions = normalizeQuestions(
          assignment.question_paper_id ? papersById.get(String(assignment.question_paper_id))?.questions : null
        );

        if (assignmentQuestions.length === 0) {
          const firstAttemptWithPaper = (attempts || []).find((attempt: any) => {
            const attemptPaperId = attempt?.submission_data?.question_paper_id;
            return attemptPaperId && papersById.has(String(attemptPaperId));
          });
          if (firstAttemptWithPaper?.submission_data?.question_paper_id) {
            assignmentQuestions = normalizeQuestions(
              papersById.get(String(firstAttemptWithPaper.submission_data.question_paper_id))?.questions
            );
          }
        }

        if (assignmentQuestions.length === 0) {
          const firstQuestionLevelData = (attempts || []).find((attempt: any) =>
            Array.isArray(attempt?.submission_data?.question_level_data) && attempt.submission_data.question_level_data.length > 0
          )?.submission_data?.question_level_data;
          assignmentQuestions = buildQuestionsFromQuestionLevelData(firstQuestionLevelData || []);
        }

        if (assignmentQuestions.length === 0) {
          const firstResponseRows = Array.from(responsesByStudent.values()).find((rows: any[]) => Array.isArray(rows) && rows.length > 0) || [];
          assignmentQuestions = buildQuestionsFromQuestionLevelData(firstResponseRows);
        }

        const normalizedSubmissions = (attempts || []).map((attempt: any) => {
          const existingRows = Array.isArray(attempt?.submission_data?.question_level_data)
            ? attempt.submission_data.question_level_data
            : [];
          const responseRows = responsesByStudent.get(attempt.student_id) || [];
          const normalizedResponseRows = normalizeQuestionLevelData(responseRows, attempt.assignment_id, attempt.student_id);

          const attemptSpecificQuestions = normalizeQuestions(
            attempt?.submission_data?.question_paper_id
              ? papersById.get(String(attempt.submission_data.question_paper_id))?.questions
              : null
          );
          const fallbackQuestions = attemptSpecificQuestions.length > 0
            ? attemptSpecificQuestions
            : assignmentQuestions;

          const answersFromSubmission = attempt?.submission_data?.answers;
          const derivedRowsFromQuestions = fallbackQuestions.length > 0 && answersFromSubmission && typeof answersFromSubmission === 'object'
            ? buildQuestionLevelDataFromQuestions(attempt.assignment_id, attempt.student_id, fallbackQuestions, answersFromSubmission)
            : [];

          const derivedRowsFromLooseAnswers = derivedRowsFromQuestions.length === 0
            ? buildQuestionLevelDataFromLooseAnswers(attempt.assignment_id, attempt.student_id, answersFromSubmission)
            : [];

          const textualSubmission = safeText(
            attempt?.submission_data?.submission_text ??
            attempt?.submission_data?.text ??
            attempt?.submission_data?.response_text ??
            attempt?.submission_data?.answer_text ??
            ''
          );

          const textualFallbackRows = textualSubmission
            ? [{
                assignment_id: attempt.assignment_id,
                student_id: attempt.student_id,
                question_id: 'text-response',
                question_index: 0,
                question_text: fallbackQuestions[0]?.text || `${assignment.title || 'Assignment'} Response`,
                question_type: 'subjective',
                options: [],
                student_selected_answer: textualSubmission,
                correct_answer: null,
                is_correct: false,
              }]
            : [];

          const resolvedQuestionLevelData = existingRows.length > 0
            ? existingRows
            : normalizedResponseRows.length > 0
              ? normalizedResponseRows
              : derivedRowsFromQuestions.length > 0
                ? derivedRowsFromQuestions
                : derivedRowsFromLooseAnswers.length > 0
                  ? derivedRowsFromLooseAnswers
                  : textualFallbackRows;

          return {
            ...attempt,
            submission_data: {
              ...(attempt?.submission_data || {}),
              question_level_data: resolvedQuestionLevelData,
            },
            submission_time: attempt.submitted_at || attempt.completed_at || attempt.updated_at,
            has_question_level_data: resolvedQuestionLevelData.length > 0,
            response_data_missing: resolvedQuestionLevelData.length === 0,
            resolved_questions: fallbackQuestions,
          };
        });

        const submissionsWithReportLinks = await Promise.all(normalizedSubmissions.map(async (attempt: any) => {
          let reportPath = attempt?.submission_data?.report_pdf_path || null;
          let reportUrl = null;
          let reportError = attempt?.submission_data?.report_pdf_error || null;

          const questionRows = Array.isArray(attempt?.submission_data?.question_level_data)
            ? attempt.submission_data.question_level_data
            : [];

          if (!reportPath && questionRows.length > 0) {
            try {
              await ensureReportBucket();

              const reportPdfBytes = await generateAssignmentReportPdf({
                assignmentTitle: assignment.title || 'Assignment',
                subject: safeText(
                  attempt?.submission_data?.subject ||
                  attempt?.submission_data?.assignment_subject ||
                  assignment.assignment_type ||
                  'N/A'
                ),
                roomName: assignment.rooms?.name || 'N/A',
                assignmentType: assignment.assignment_type || 'N/A',
                studentName: safeText(attempt?.students?.name || 'Student'),
                studentId: safeText(attempt?.students?.id || attempt?.student_id || 'N/A'),
                submittedAt: attempt.submission_time || new Date().toISOString(),
                questionRows,
                submissionMeta: attempt?.submission_data || {},
              });

              const generatedAt = new Date().toISOString();
              const safeTimestamp = generatedAt.replace(/[:.]/g, '-');
              reportPath = `${assignmentId}/${attempt.student_id}/${attempt.id}-${safeTimestamp}.pdf`;

              const { error: uploadReportError } = await supabase
                .storage
                .from(ASSIGNMENT_REPORT_BUCKET)
                .upload(reportPath, reportPdfBytes, {
                  contentType: 'application/pdf',
                  upsert: true,
                });

              if (uploadReportError) {
                throw uploadReportError;
              }

              reportError = null;
              const mergedSubmissionData = {
                ...(attempt?.submission_data || {}),
                report_pdf_path: reportPath,
                report_pdf_generated_at: generatedAt,
                report_pdf_error: null,
              };

              const { error: persistReportPathError } = await supabase
                .from('assignment_attempts')
                .update({
                  submission_data: mergedSubmissionData,
                  updated_at: generatedAt,
                })
                .eq('id', attempt.id);

              if (persistReportPathError) {
                console.warn('Unable to persist generated report path on attempt', {
                  attemptId: attempt.id,
                  error: persistReportPathError,
                });
              }

              attempt.submission_data = mergedSubmissionData;
            } catch (reportGenerationError) {
              reportError = getErrorMessage(reportGenerationError);
              console.error('Failed on-demand assignment report generation during review-list', {
                attemptId: attempt.id,
                assignmentId,
                studentId: attempt.student_id,
                error: reportGenerationError,
              });
            }
          }

          if (reportPath) {
            try {
              const { data: signed, error: signedUrlError } = await supabase
                .storage
                .from(ASSIGNMENT_REPORT_BUCKET)
                .createSignedUrl(reportPath, 60 * 60);
              if (!signedUrlError) {
                reportUrl = signed?.signedUrl || null;
              } else {
                reportError = getErrorMessage(signedUrlError);
              }
            } catch (signedUrlException) {
              reportError = getErrorMessage(signedUrlException);
              console.warn('Unable to create signed URL for assignment report', {
                attemptId: attempt?.id,
                reportPath,
                error: signedUrlException,
              });
            }
          }

          return {
            ...attempt,
            submission_data: {
              ...(attempt?.submission_data || {}),
              report_pdf_path: reportPath,
              report_pdf_url: reportUrl,
              report_pdf_error: reportError,
            },
          };
        }));

        const payload = {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            due_date: assignment.due_date,
            room_name: assignment.rooms?.name || 'All Classes',
            assignment_type: assignment.assignment_type,
            question_paper_id: assignment.question_paper_id,
            questions: assignmentQuestions,
            total_questions: assignmentQuestions.length,
            has_question_level_template: assignmentQuestions.length > 0,
            response_table_available: responseTableAvailable,
            response_table_warning: responseTableAvailable
              ? null
              : 'assignment_responses table missing. Run CREATE-ASSIGNMENT-RESPONSES-TABLE.sql to enable response fallback.',
          },
          submissions: submissionsWithReportLinks,
        };

        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'POST' && (action === 'review-update' || action === 'publish-result')) {
        if (!attemptId) {
          return new Response(JSON.stringify({ error: 'attempt_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

        const { data: existingAttempt, error: existingAttemptError } = await supabase
          .from('assignment_attempts')
          .select(`
            *,
            assignments!inner(
              id,
              teacher_id,
              title,
              room_id,
              assignment_type,
              question_paper_id,
              game_config,
              rooms(name)
            ),
            students(
              id,
              name,
              email
            )
          `)
          .eq('id', attemptId)
          .single();

        if (existingAttemptError || !existingAttempt) {
          return new Response(JSON.stringify({ error: 'Submission not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (existingAttempt.assignments?.teacher_id !== teacherId) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (existingAttempt.status === 'completed') {
          return new Response(JSON.stringify({ error: 'Result already published and locked' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const allowedStatuses = new Set(['completed']);
        let nextStatus = action === 'publish-result' ? 'completed' : (body?.status || existingAttempt.status);
        if (body?.publishResult === true) {
          nextStatus = 'completed';
        }

        if (!allowedStatuses.has(nextStatus)) {
          return new Response(JSON.stringify({ error: 'Invalid review status' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const reviewMeta = {
          reviewed_at: new Date().toISOString(),
          reviewed_by_teacher_id: teacherId,
          review_status: nextStatus,
          published_at: nextStatus === 'completed' ? new Date().toISOString() : null,
        };

        let questionPaperQuestions: any[] = [];
        if (existingAttempt.assignments?.question_paper_id) {
          const { data: questionPaper } = await supabase
            .from('question_papers')
            .select('questions')
            .eq('id', existingAttempt.assignments.question_paper_id)
            .single();
          questionPaperQuestions = normalizeQuestions(questionPaper?.questions);
        }

        const storedQuestionLevelData = normalizeQuestionLevelData(
          existingAttempt.submission_data?.question_level_data,
          existingAttempt.assignment_id,
          existingAttempt.student_id
        );
        if (questionPaperQuestions.length === 0 && storedQuestionLevelData.length > 0) {
          questionPaperQuestions = buildQuestionsFromQuestionLevelData(storedQuestionLevelData);
        }

        const studentAnswers = existingAttempt.submission_data?.answers || {};
        const questionResultsFromBody = Array.isArray(body?.questionResults) ? body.questionResults : null;
        const inferredTotalMarks = questionPaperQuestions.length > 0
          ? questionPaperQuestions.length
          : Math.max(storedQuestionLevelData.length, Object.keys(studentAnswers || {}).length, 0);
        const manualTotalMarks = typeof body?.totalMarks === 'number' && Number.isFinite(body.totalMarks)
          ? Math.max(1, Math.round(body.totalMarks))
          : null;
        const resolvedTotalMarks = manualTotalMarks ?? (inferredTotalMarks > 0 ? inferredTotalMarks : null);

        const computedQuestionResults = (questionPaperQuestions.length > 0
          ? questionPaperQuestions.map((question: any) => {
              const fromTeacher = questionResultsFromBody?.find((row: any) => Number(row?.questionIndex) === Number(question.index));
              const studentAnswer = studentAnswers?.[question.index] ?? studentAnswers?.[String(question.index)] ?? null;
              const autoCorrect = compareAnswer(question, studentAnswer);
              return {
                question_id: question.id ?? question.index,
                question_index: question.index,
                question_text: question.text,
                question_type: question.type,
                options: question.options,
                student_answer: studentAnswer,
                correct_answer: question.correct_answer,
                is_correct: typeof fromTeacher?.isCorrect === 'boolean' ? fromTeacher.isCorrect : autoCorrect,
              };
            })
          : storedQuestionLevelData.map((row: any) => {
              const fromTeacher = questionResultsFromBody?.find((item: any) => Number(item?.questionIndex) === Number(row.question_index));
              return {
                question_id: row.question_id,
                question_index: row.question_index,
                question_text: row.question_text,
                question_type: row.question_type,
                options: row.options,
                student_answer: row.student_selected_answer,
                correct_answer: row.correct_answer,
                is_correct: typeof fromTeacher?.isCorrect === 'boolean' ? fromTeacher.isCorrect : Boolean(row.is_correct),
              };
            })) as any[];

        const autoAchievedMarks = computedQuestionResults.reduce((sum, row) => sum + (row.is_correct ? 1 : 0), 0);
        const scoreCap = resolvedTotalMarks && resolvedTotalMarks > 0 ? resolvedTotalMarks : 9999;
        const manualMarks = typeof body?.manualMarks === 'number' && Number.isFinite(body.manualMarks)
          ? Math.max(0, Math.min(scoreCap, Math.round(body.manualMarks)))
          : null;
        const overrideMarks = typeof body?.overrideMarks === 'number' && Number.isFinite(body.overrideMarks)
          ? Math.max(0, Math.min(scoreCap, Math.round(body.overrideMarks)))
          : null;
        const achievedMarks = manualMarks ?? overrideMarks ?? autoAchievedMarks;
        const effectiveTotalMarks = resolvedTotalMarks ?? (manualMarks !== null ? Math.max(1, manualMarks) : 0);
        const resolvedFeedback = typeof body?.feedback === 'string' && body.feedback.trim().length > 0
          ? body.feedback
          : (nextStatus === 'completed'
            ? buildAutoFeedback(achievedMarks, effectiveTotalMarks > 0 ? effectiveTotalMarks : computedQuestionResults.length)
            : (existingAttempt.feedback || ''));

        const mergedSubmissionData = {
          ...(existingAttempt.submission_data || {}),
          question_level_data: computedQuestionResults.map((row: any) => ({
            assignment_id: existingAttempt.assignment_id,
            student_id: existingAttempt.student_id,
            question_id: row.question_id,
            question_index: row.question_index,
            question_text: row.question_text,
            question_type: row.question_type,
            options: row.options,
            student_selected_answer: row.student_answer,
            correct_answer: row.correct_answer,
            is_correct: row.is_correct,
          })),
          teacher_review: {
            ...(existingAttempt.submission_data?.teacher_review || {}),
            ...reviewMeta,
            achieved_marks: effectiveTotalMarks > 0 ? achievedMarks : null,
            total_marks: effectiveTotalMarks > 0 ? effectiveTotalMarks : null,
            auto_achieved_marks: effectiveTotalMarks > 0 ? autoAchievedMarks : null,
            manual_assigned_marks: manualMarks,
            manual_total_marks: manualTotalMarks,
            manual_override_marks: overrideMarks,
            question_results: computedQuestionResults,
          },
        };

        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          updated_at: new Date().toISOString(),
          submission_data: mergedSubmissionData,
        };

        if (effectiveTotalMarks > 0) {
          updatePayload.score = achievedMarks;
          updatePayload.max_score = effectiveTotalMarks;
        } else if (typeof body?.score === 'number' && Number.isFinite(body.score)) {
          const normalizedScore = Math.max(0, Math.min(100, Math.round(body.score)));
          updatePayload.score = normalizedScore;
          updatePayload.max_score = 100;
        }

        updatePayload.feedback = resolvedFeedback;

        const { data: updatedAttempt, error: updateError } = await supabase
          .from('assignment_attempts')
          .update(updatePayload)
          .eq('id', attemptId)
          .select(`
            *,
            assignments(
              id,
              title,
              room_id,
              rooms(name)
            ),
            students(
              id,
              name,
              email
            )
          `)
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify(updatedAttempt), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify token and get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('access_token', token)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Invalid access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET' && assignmentId) {
      if (action === 'result-detail') {
        const { data: attempt, error: attemptError } = await supabase
          .from('assignment_attempts')
          .select(`
            *,
            assignments(
              id,
              title,
              description,
              due_date
            )
          `)
          .eq('assignment_id', assignmentId)
          .eq('student_id', student.id)
          .single();

        if (attemptError || !attempt) {
          return new Response(JSON.stringify({ error: 'Result not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (attempt.status !== 'completed') {
          return new Response(JSON.stringify({ error: 'Result not published yet' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const questionLevelData = normalizeQuestionLevelData(
          attempt?.submission_data?.question_level_data,
          attempt.assignment_id,
          attempt.student_id
        );
        let resolvedQuestionLevelData = questionLevelData;
        if (resolvedQuestionLevelData.length === 0) {
          try {
            const responsesByStudent = await loadAssignmentResponses(attempt.assignment_id, [attempt.student_id]);
            const responseRows = responsesByStudent.get(attempt.student_id) || [];
            resolvedQuestionLevelData = normalizeQuestionLevelData(responseRows, attempt.assignment_id, attempt.student_id);
          } catch (loadResponsesError) {
            if (isMissingAssignmentResponsesTableError(loadResponsesError)) {
              console.warn('assignment_responses table missing while loading result-detail', {
                assignmentId: attempt.assignment_id,
                studentId: attempt.student_id,
                error: loadResponsesError,
              });
            } else {
              throw loadResponsesError;
            }
          }
        }
        const teacherQuestionResults = Array.isArray(attempt?.submission_data?.teacher_review?.question_results)
          ? attempt.submission_data.teacher_review.question_results
          : [];
        const finalQuestionRows = resolvedQuestionLevelData.map((row: any) => {
          const teacherRow = teacherQuestionResults.find((item: any) => Number(item?.question_index) === Number(row.question_index));
          return {
            ...row,
            is_correct: typeof teacherRow?.is_correct === 'boolean' ? teacherRow.is_correct : row.is_correct,
          };
        });

        const totalQuestions = finalQuestionRows.length;
        const correctAnswers = finalQuestionRows.filter((row: any) => row.is_correct).length;
        const incorrectAnswers = Math.max(totalQuestions - correctAnswers, 0);
        const achievedMarks = typeof attempt?.submission_data?.teacher_review?.achieved_marks === 'number'
          ? attempt.submission_data.teacher_review.achieved_marks
          : (typeof attempt.score === 'number' ? attempt.score : correctAnswers);
        const totalMarks = typeof attempt?.submission_data?.teacher_review?.total_marks === 'number'
          ? attempt.submission_data.teacher_review.total_marks
          : (typeof attempt.max_score === 'number' ? attempt.max_score : totalQuestions);

        return new Response(JSON.stringify({
          assignment: {
            id: attempt.assignment_id,
            title: attempt.assignments?.title || 'Assignment',
            description: attempt.assignments?.description || null,
            due_date: attempt.assignments?.due_date || null,
          },
          attempt: {
            id: attempt.id,
            status: attempt.status,
            submitted_at: attempt.submitted_at,
            reviewed_at: attempt?.submission_data?.teacher_review?.reviewed_at || null,
            published_at: attempt?.submission_data?.teacher_review?.published_at || null,
            feedback: attempt.feedback || '',
            achieved_marks: achievedMarks,
            total_marks: totalMarks,
            percentage: totalMarks > 0 ? Math.round((achievedMarks / totalMarks) * 100) : 0,
          },
          questions: finalQuestionRows,
          stats: {
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            incorrect_answers: incorrectAnswers,
            achieved_marks: achievedMarks,
            total_marks: totalMarks,
            percentage: totalMarks > 0 ? Math.round((achievedMarks / totalMarks) * 100) : 0,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get specific assignment attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw attemptError;
      }

      return new Response(JSON.stringify(attempt || null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && action === 'start' && assignmentId) {
      // Start an assignment attempt
      const { data: existingAttempt, error: checkError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let result;
      if (existingAttempt) {
        const allowReattempt = existingAttempt.submission_data?.teacher_review?.allow_reattempt === true;

        // Update existing attempt
        if (
          existingAttempt.status === 'completed' ||
          existingAttempt.status === 'submitted'
        ) {
          // Reattempts are blocked after submission unless teacher explicitly allows it.
          if (!allowReattempt) {
            return new Response(JSON.stringify({ error: 'Reattempt disabled after submission. Please wait for teacher review.' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const { data: updatedAttempt, error: updateError } = await supabase
            .from('assignment_attempts')
            .update({
              status: 'in_progress',
              attempts_count: (existingAttempt.attempts_count || 0) + 1,
              started_at: new Date().toISOString(),
              completed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttempt.id)
            .select()
            .single();

          if (updateError) throw updateError;
          result = updatedAttempt;
        } else if (existingAttempt.status === 'in_progress') {
          // Already in progress
          result = existingAttempt;
        } else {
          // Update from not_started to in_progress
          const { data: updatedAttempt, error: updateError } = await supabase
            .from('assignment_attempts')
            .update({
              status: 'in_progress',
              attempts_count: 1,
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttempt.id)
            .select()
            .single();

          if (updateError) throw updateError;
          result = updatedAttempt;
        }
      } else {
        // Create new attempt
        const { data: newAttempt, error: createError } = await supabase
          .from('assignment_attempts')
          .insert([{
            assignment_id: assignmentId,
            student_id: student.id,
            status: 'in_progress',
            attempts_count: 1,
            started_at: new Date().toISOString(),
            realtime_synced: true
          }])
          .select(`
            *,
            assignments!inner(
              id,
              title,
              teacher_id
            ),
            students!inner(
              id,
              name
            )
          `)
          .single();

        if (createError) throw createError;
        result = newAttempt;
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && action === 'complete' && assignmentId) {

      // Debug: log incoming completion request
      const body = await req.json();
      const { score, submissionData, feedback } = body;
      console.log('🟢 [DEBUG] Assignment completion request:', {
        assignmentId,
        studentId: student.id,
        body
      });

      const { data: existingAttempt, error: checkError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          console.warn('🟡 [DEBUG] No attempt found for completion:', { assignmentId, studentId: student.id });
          return new Response(JSON.stringify({ error: 'No attempt found. Please start the assignment first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.error('🔴 [DEBUG] Error looking up attempt for completion:', checkError);
        throw checkError;
      }

      if (existingAttempt.status === 'completed') {
        return new Response(JSON.stringify({ error: 'Result already published. Resubmission is locked.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: assignmentMeta } = await supabase
        .from('assignments')
        .select('id, question_paper_id')
        .eq('id', assignmentId)
        .single();

      let questionsForSubmission: any[] = [];
      const questionPaperIdFromSubmission = submissionData?.question_paper_id;
      const resolvedQuestionPaperId = assignmentMeta?.question_paper_id || questionPaperIdFromSubmission;
      if (resolvedQuestionPaperId) {
        const { data: questionPaper } = await supabase
          .from('question_papers')
          .select('questions')
          .eq('id', resolvedQuestionPaperId)
          .single();
        questionsForSubmission = normalizeQuestions(questionPaper?.questions);
      }

      const rawAnswers = submissionData?.answers || {};
      const providedQuestionLevelData = normalizeQuestionLevelData(submissionData?.question_level_data, assignmentId, student.id);
      const derivedQuestionLevelData = questionsForSubmission.length > 0
        ? buildQuestionLevelDataFromQuestions(assignmentId, student.id, questionsForSubmission, rawAnswers)
        : [];

      const finalQuestionLevelData = providedQuestionLevelData.length > 0 ? providedQuestionLevelData : derivedQuestionLevelData;
      const submissionWarnings: string[] = [];
      if (finalQuestionLevelData.length === 0) {
        console.error('🔴 [VALIDATION] Missing question-level responses at submission time', {
          assignmentId,
          studentId: student.id,
          resolvedQuestionPaperId,
        });
        return new Response(JSON.stringify({
          error: 'Unable to submit assignment because question responses are missing. Please retry the submission.'
        }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const submittedAt = new Date().toISOString();
      const timestampedQuestionLevelData = finalQuestionLevelData.map((row: any) => ({
        ...row,
        submitted_at: submittedAt,
      }));

      let reportPdfPath: string | null = null;
      let reportPdfGeneratedAt: string | null = null;
      let reportPdfError: string | null = null;

      try {
        const { data: assignmentForReport } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            assignment_type,
            rooms (
              id,
              name
            )
          `)
          .eq('id', assignmentId)
          .single();

        const subject = safeText(
          submissionData?.subject ||
          submissionData?.assignment_subject ||
          assignmentForReport?.assignment_type ||
          'N/A'
        );

        const reportPdfBytes = await generateAssignmentReportPdf({
          assignmentTitle: assignmentForReport?.title || 'Assignment',
          subject,
          roomName: assignmentForReport?.rooms?.name || 'N/A',
          assignmentType: assignmentForReport?.assignment_type || 'N/A',
          studentName: safeText(student?.name || 'Student'),
          studentId: safeText(student?.public_id || student?.student_id || student?.id || 'N/A'),
          submittedAt,
          questionRows: timestampedQuestionLevelData,
          submissionMeta: submissionData || {},
        });

        await ensureReportBucket();

        const safeTimestamp = submittedAt.replace(/[:.]/g, '-');
        reportPdfPath = `${assignmentId}/${student.id}/${existingAttempt.id}-${safeTimestamp}.pdf`;

        const { error: uploadReportError } = await supabase
          .storage
          .from(ASSIGNMENT_REPORT_BUCKET)
          .upload(reportPdfPath, reportPdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadReportError) {
          throw uploadReportError;
        }

        reportPdfGeneratedAt = submittedAt;
      } catch (reportError) {
        reportPdfPath = null;
        reportPdfGeneratedAt = null;
        reportPdfError = getErrorMessage(reportError);
        console.error('Failed to generate/upload assignment report PDF', {
          assignmentId,
          studentId: student.id,
          error: reportError,
        });
      }

      const safeScore = typeof score === 'number' && Number.isFinite(score) ? Math.round(score) : null;
      const nextSubmissionData = {
        ...(submissionData || {}),
        auto_score: safeScore,
        question_level_data: timestampedQuestionLevelData,
        report_pdf_path: reportPdfPath,
        report_pdf_generated_at: reportPdfGeneratedAt,
        report_pdf_error: reportPdfError,
        data_warnings: submissionWarnings,
      };

      try {
        await storeAssignmentResponses(assignmentId, student.id, timestampedQuestionLevelData, submittedAt);
      } catch (storeResponsesError) {
        console.error('🔴 [VALIDATION] Failed to persist assignment_responses rows', {
          assignmentId,
          studentId: student.id,
          error: storeResponsesError,
        });
        return new Response(JSON.stringify({
          error: 'Unable to save question responses for this submission. Please try again.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: updatedAttempt, error: updateError } = await supabase
        .from('assignment_attempts')
        .update({
          status: 'submitted',
          score: null,
          max_score: null,
          completed_at: submittedAt,
          submitted_at: submittedAt,
          submission_data: nextSubmissionData,
          feedback: feedback || null,
          updated_at: new Date().toISOString(),
          realtime_synced: true
        })
        .eq('id', existingAttempt.id)
        .select(`
          *,
          assignments!inner(
            id,
            title,
            teacher_id,
            room_id,
            rooms(
              id,
              name
            ),
            teachers!inner(
              id,
              auth0_user_id,
              full_name
            )
          ),
          students!inner(
            id,
            name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('🔴 [DEBUG] Update error details:', updateError);
        throw updateError;
      }

      // Log successful completion for debugging
      console.log('✅ [DEBUG] Assignment completed successfully:', {
        id: updatedAttempt.id,
        assignment_id: updatedAttempt.assignment_id,
        student_id: updatedAttempt.student_id,
        student_name: updatedAttempt.students?.name,
        score: safeScore,
        submitted_at: updatedAttempt.submitted_at,
        status: updatedAttempt.status
      });

      // Send a broadcast notification to teachers for immediate updates
      try {
        const broadcastChannel = supabase.channel('assignment-completion-alerts');
        const roomName = updatedAttempt.assignments?.rooms?.name || 'All Classes';
        const assignmentName = updatedAttempt.assignments?.title || 'Assignment';
        const submissionTime = updatedAttempt.submitted_at || submittedAt;

        await broadcastChannel.send({
          type: 'broadcast',
          event: 'assignment-submitted',
          payload: {
            assignmentId: updatedAttempt.assignment_id,
            assignmentName,
            studentId: updatedAttempt.student_id,
            studentName: updatedAttempt.students?.name || 'Unknown Student',
            roomId: updatedAttempt.assignments?.room_id,
            roomName,
            submissionTime,
            teacherId: updatedAttempt.assignments?.teacher_id,
            status: 'submitted'
          }
        });
        // Backward compatibility event for existing clients still listening on old event name.
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'assignment-completed',
          payload: {
            assignmentId: updatedAttempt.assignment_id,
            assignmentName,
            studentId: updatedAttempt.student_id,
            studentName: updatedAttempt.students?.name || 'Unknown Student',
            roomId: updatedAttempt.assignments?.room_id,
            roomName,
            submissionTime,
            teacherId: updatedAttempt.assignments?.teacher_id,
            status: 'submitted'
          }
        });
        console.log('📡 Broadcast sent for assignment submission');
      } catch (broadcastError) {
        console.warn('Failed to send completion broadcast:', broadcastError);
        // Don't fail the main operation if broadcast fails
      }

      return new Response(JSON.stringify(updatedAttempt), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET' && !assignmentId) {
      // Get all attempts for this student
      const { data: attempts, error: attemptsError } = await supabase
        .from('assignment_attempts')
        .select(`
          *,
          assignments (
            id,
            title,
            description,
            due_date,
            assignment_type,
            games (
              id,
              name,
              game_type
            )
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      return new Response(JSON.stringify(attempts || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assignment-attempts function:', error);
    const message = getErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});