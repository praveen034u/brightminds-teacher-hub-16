import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Calendar, Clock, User, Home, HelpCircle, Bell, Users, Play, Gamepad2, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';
import { useSubmissionStore } from '@/context/SubmissionStore';
import { aiAssessmentSettings } from '@/config/appSettings';

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isEmpty = !stripHtml(value);

  const runCommand = (command: string) => {
    if (typeof document === 'undefined') return;
    document.execCommand(command, false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div className="rounded-lg border-2 border-gray-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 p-2">
        <button type="button" onClick={() => runCommand('bold')} className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          B
        </button>
        <button type="button" onClick={() => runCommand('italic')} className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          I
        </button>
        <button type="button" onClick={() => runCommand('underline')} className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          U
        </button>
        <button type="button" onClick={() => runCommand('insertUnorderedList')} className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          Bullet List
        </button>
        <button type="button" onClick={() => runCommand('insertOrderedList')} className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          Numbered List
        </button>
      </div>
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute left-4 top-4 text-sm text-gray-400">
            {placeholder || 'Type your answer here...'}
          </div>
        )}
        <div
          ref={editorRef}
          className="min-h-[140px] p-4 text-sm text-gray-700 focus:outline-none"
          contentEditable
          onInput={handleInput}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
};

// Simple game components
// Utility: fuzzy matching to accept near-miss answers (typos, small variations)
const normalizeForCompare = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const levenshtein = (a: string, b: string) => {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
};

const fuzzyEqual = (a: string, b: string) => {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return true;
  const dist = levenshtein(na, nb);
  // allow 1 edit for short words, ~20% of length for longer words
  const threshold = maxLen <= 4 ? 1 : Math.max(1, Math.floor(maxLen * 0.2));
  return dist <= threshold;
};

const WordScrambleGame = ({ config, onComplete }: { config: any; onComplete?: (score: number) => void }) => {
  // Support both config.questions and direct array config
  const questions = Array.isArray(config?.questions)
    ? config.questions
    : Array.isArray(config)
      ? config
      : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const currentWord = questions[currentIndex];
  if (!currentWord) {
    return (
      <div className="text-center p-8">
        <h3 className="text-2xl font-bold mb-4">🔤 Word Scramble Challenge</h3>
        <p className="text-lg text-red-600">No questions available for this assignment.</p>
      </div>
    );
  }

  const checkAnswer = () => {
    const userAnswer = answer.trim();
    const correctAnswer = currentWord.answer;
    let earned = 0;
    if (fuzzyEqual(userAnswer, correctAnswer)) {
      setFeedback('🎉 Correct! Well done!');
      setIsCorrect(true);
      earned = 100;
      toast.success('Correct answer!');
    } else {
      setFeedback('❌ Incorrect answer. Try the next one!');
      setIsCorrect(false);
    }
    setScore((prev) => prev + earned);
    setAnswered(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setAnswer('');
    setFeedback('');
    setIsCorrect(false);
    setAnswered(false);
  };

  const handleSubmit = () => {
    // Average score over 5 questions
    onComplete?.(Math.round(score / questions.length));
  };

  return (
    <div className="text-center p-8">
      <h3 className="text-2xl font-bold mb-4">🔤 Word Scramble Challenge</h3>
      <p className="text-lg mb-6">Unscramble this word ({currentIndex + 1} of {questions.length}):</p>
      <div className="text-3xl font-mono bg-blue-100 p-4 rounded-lg mb-6">
        {currentWord.scrambled}
      </div>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className={`border-2 p-3 rounded-lg text-lg w-64 text-center ${
          isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
        }`}
        disabled={answered}
      />
      {feedback && (
        <div className={`mt-3 text-lg font-medium ${
          isCorrect ? 'text-green-600' : 'text-red-600'
        }`}>
          {feedback}
        </div>
      )}
      <div className="mt-4 flex gap-4 justify-center">
        {!answered && (
          <Button
            onClick={checkAnswer}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!answer.trim()}
          >
            Check Answer
          </Button>
        )}
        {answered && currentIndex < questions.length - 1 && (
          <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700 text-white">
            Next Question
          </Button>
        )}
        {answered && currentIndex === questions.length - 1 && (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            Submit Assignment
          </Button>
        )}
      </div>
    </div>
  );
};

const EmojiGuessGame = ({ config, onComplete }: { config: any; onComplete?: (score: number) => void }) => {
  // Use puzzles from config, fallback to empty array
  // Support both config.puzzles and direct array config
  const puzzles = Array.isArray(config?.puzzles)
    ? config.puzzles
    : Array.isArray(config)
      ? config
      : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const currentPuzzle = puzzles[currentIndex];
  if (!currentPuzzle) {
    return (
      <div className="text-center p-8">
        <h3 className="text-2xl font-bold mb-4">🎯 Emoji Guess Game</h3>
        <p className="text-lg text-red-600">No emoji puzzles available for this assignment.</p>
      </div>
    );
  }

  const checkAnswer = () => {
    const userGuess = guess.trim().toLowerCase();
    const isMatch = currentPuzzle.answers.some(answer =>
      userGuess.includes(answer.toLowerCase()) || answer.toLowerCase().includes(userGuess)
    );
    let earned = 0;
    if (isMatch) {
      setFeedback('🎉 Excellent guess! You got it!');
      setIsCorrect(true);
      earned = 95;
      toast.success('Great job!');
    } else {
      setFeedback('❌ Incorrect answer. Try the next one!');
      setIsCorrect(false);
    }
    setScore((prev) => prev + earned);
    setAnswered(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setGuess('');
    setFeedback('');
    setIsCorrect(false);
    setAnswered(false);
  };

  const handleSubmit = () => {
    onComplete?.(Math.round(score / puzzles.length));
  };

  return (
    <div className="text-center p-8">
      <h3 className="text-2xl font-bold mb-4">🎯 Emoji Guess Game</h3>
      <p className="text-lg mb-6">What does this emoji combination mean? ({currentIndex + 1} of {puzzles.length})</p>
      <div className="text-6xl mb-6">
        {currentPuzzle.emojis}
      </div>
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Type your guess..."
        className={`border-2 p-3 rounded-lg text-lg w-64 text-center ${
          isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
        }`}
        disabled={answered}
      />
      {feedback && (
        <div className={`mt-3 text-lg font-medium ${
          isCorrect ? 'text-green-600' : 'text-red-600'
        }`}>
          {feedback}
        </div>
      )}
      <div className="mt-4 flex gap-4 justify-center">
        {!answered && (
          <Button
            onClick={checkAnswer}
            className="bg-green-600 hover:bg-green-700"
            disabled={!guess.trim()}
          >
            Check Answer
          </Button>
        )}
        {answered && currentIndex < puzzles.length - 1 && (
          <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700 text-white">
            Next Question
          </Button>
        )}
        {answered && currentIndex === puzzles.length - 1 && (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            Submit Assignment
          </Button>
        )}
      </div>
    </div>
  );
};

const RiddleGame = ({ config, onComplete }: { config: any; onComplete?: (score: number) => void }) => {
  // Support both flat array and nested (category/difficulty) structure
  let riddles: any[] = [];
  if (Array.isArray(config?.riddles)) {
    riddles = config.riddles;
  } else if (config?.riddles && typeof config.riddles === 'object') {
    // Flatten all riddles from all categories/difficulties
    riddles = Object.values(config.riddles)
      .flatMap((cat: any) =>
        typeof cat === 'object'
          ? Object.values(cat).flatMap((arr: any) => Array.isArray(arr) ? arr : [])
          : []
      );
  }

  // State declarations (only once)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const currentRiddle = riddles[currentIndex];
  if (!currentRiddle) {
    return (
      <div className="text-center p-8">
        <h3 className="text-2xl font-bold mb-4">🧩 Riddle Master</h3>
        <p className="text-lg text-red-600">No riddles available for this assignment.</p>
      </div>
    );
  }

  const checkAnswer = () => {
    const userAnswer = answer.trim();
    // Support both answer array and correctAnswer index
    let isMatch = false;
    if (Array.isArray(currentRiddle.answers)) {
      isMatch = currentRiddle.answers.some((correctAnswer: string) =>
        fuzzyEqual(userAnswer, correctAnswer) ||
        userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) ||
        correctAnswer.toLowerCase().includes(userAnswer.toLowerCase())
      );
    } else if (typeof currentRiddle.correctAnswer === 'number' && Array.isArray(currentRiddle.options)) {
      isMatch = fuzzyEqual(userAnswer, currentRiddle.options[currentRiddle.correctAnswer]);
    }
    let earned = 0;
    if (isMatch) {
      setFeedback('🎉 Brilliant! You solved the riddle!');
      setIsCorrect(true);
      earned = 90;
      toast.success('Riddle solved!');
    } else {
      setFeedback('❌ Incorrect answer. Try the next one!');
      setIsCorrect(false);
    }
    setScore((prev) => prev + earned);
    setAnswered(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setAnswer('');
    setFeedback('');
    setIsCorrect(false);
    setAnswered(false);
  };

  const handleSubmit = () => {
    onComplete?.(Math.round(score / riddles.length));
  };

  return (
    <div className="text-center p-8">
      <h3 className="text-2xl font-bold mb-4">🧩 Riddle Master</h3>
      <div className="text-lg mb-2 flex items-center justify-center gap-2">
        Riddle {currentIndex + 1} of {riddles.length}
      </div>
      <div className="bg-purple-100 p-6 rounded-lg mb-6 max-w-md mx-auto">
        <p className="text-lg font-medium">
          {currentRiddle.question}
        </p>
      </div>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        className={`border-2 p-3 rounded-lg text-lg w-64 text-center ${
          isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
        }`}
        disabled={answered}
      />
      {feedback && (
        <div className={`mt-3 text-lg font-medium ${
          isCorrect ? 'text-green-600' : 'text-red-600'
        }`}>
          {feedback}
        </div>
      )}
      <div className="mt-4 flex gap-4 justify-center">
        {!answered && (
          <Button
            onClick={checkAnswer}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={!answer.trim()}
          >
            Check Answer
          </Button>
        )}
        {answered && currentIndex < riddles.length - 1 && (
          <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700 text-white">
            Next Question
          </Button>
        )}
        {answered && currentIndex === riddles.length - 1 && (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            Submit Assignment
          </Button>
        )}
      </div>
    </div>
  );
};

const CrosswordGame = ({ config, onComplete }: { config: any; onComplete?: (score: number) => void }) => {
  // Use clues from config, fallback to empty array
  const clues = config?.clues || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [letters, setLetters] = useState<string[]>(['', '', '', '', '']);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const currentClue = clues[currentIndex];
  const answerLength = currentClue.answer.length;

  const handleLetterChange = (index: number, value: string) => {
    const newLetters = [...letters];
    newLetters[index] = value.toUpperCase();
    setLetters(newLetters);
  };

  const checkAnswer = () => {
    const userAnswer = letters.slice(0, answerLength).join('');
    let earned = 0;
    if (fuzzyEqual(userAnswer, currentClue.answer)) {
      setFeedback('🎉 Perfect! You completed the crossword!');
      setIsCorrect(true);
      earned = 100;
      toast.success('Crossword solved!');
    } else {
      setFeedback('❌ Incorrect answer. Try the next one!');
      setIsCorrect(false);
    }
    setScore((prev) => prev + earned);
    setAnswered(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => prev + 1);
    setLetters(['', '', '', '', '']);
    setFeedback('');
    setIsCorrect(false);
    setAnswered(false);
  };

  const handleSubmit = () => {
    onComplete?.(Math.round(score / clues.length));
  };

  return (
    <div className="text-center p-8">
      <h3 className="text-2xl font-bold mb-4">🧩 Crossword Puzzle</h3>
      <div className="text-lg mb-2 flex items-center justify-center gap-2">
        Clue {currentIndex + 1} of {clues.length}
      </div>
      <div className="bg-yellow-100 p-6 rounded-lg mb-6 max-w-md mx-auto">
        <p className="text-lg font-medium">
          {currentClue.clue}
        </p>
      </div>
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: answerLength }).map((_, idx) => (
          <input
            key={idx}
            type="text"
            maxLength={1}
            value={letters[idx] || ''}
            onChange={(e) => handleLetterChange(idx, e.target.value)}
            className="w-12 h-12 text-2xl text-center border-2 rounded-lg focus:outline-none focus:border-yellow-500"
            disabled={answered}
          />
        ))}
      </div>
      {feedback && (
        <div className={`mt-3 text-lg font-medium ${
          isCorrect ? 'text-green-600' : 'text-red-600'
        }`}>
          {feedback}
        </div>
      )}
      <div className="mt-4 flex gap-4 justify-center">
        {!answered && (
          <Button
            onClick={checkAnswer}
            className="bg-yellow-600 hover:bg-yellow-700"
            disabled={letters.slice(0, answerLength).some(letter => !letter.trim())}
          >
            Check Answer
          </Button>
        )}
        {answered && currentIndex < clues.length - 1 && (
          <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700 text-white">
            Next Question
          </Button>
        )}
        {answered && currentIndex === clues.length - 1 && (
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">
            Submit Assignment
          </Button>
        )}
      </div>
    </div>
  );
};

interface StudentData {
  id: string;
  school_id?: string | null;
  name: string;
  email: string;
  primary_language: string;
  rooms: Array<{
    id: string;
    name: string;
    description: string;
    grade_level: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    description: string;
    due_date: string;
    status: string;
    room_id: string;
    assignment_type?: string;
    question_paper_id?: string;
    grade?: string;
    game_config?: any;
    games?: {
      id: string;
      name: string;
      game_type: string;
      game_path: string;
      categories?: string[];
      skills?: string[];
    };
    questions?: Array<{
      id: string | number;
      text: string;
      options?: string[];
      answer?: string | number;
    }>;
  }>;
  classmates: Array<{
    id: string;
    name: string;
    email: string;
    primary_language: string;
    rooms: Array<{
      id: string;
      name: string;
      description: string;
      grade_level: string;
    }>;
    shared_room_count: number;
  }>;
}

interface AssignmentAttempt {
  id: string;
  assignment_id: string;
  student_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
  attempts_count: number;
  score?: number;
  max_score?: number;
  started_at?: string;
  completed_at?: string;
  submitted_at?: string;
  submission_data?: any;
  feedback?: string;
  ai_submission_id?: string;
}

export const StudentPortalPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams?.get('token') ?? null;
  const schoolIdParam = searchParams?.get('school_id') ?? null;
  const resubmitAssignmentId = searchParams?.get('resubmit_assignment_id') ?? null;
  const resubmitHandledRef = useRef(false);
  const resubmitAttemptSnapshotRef = useRef<Record<string, AssignmentAttempt>>({});
  const resubmitAttemptOverrideRef = useRef<Record<string, AssignmentAttempt>>({});
  const hasLoadedRef = useRef(false);

  // Store token in localStorage for PWA redirect (only if explicitly accessing student portal)
  useEffect(() => {
    if (token && window.location.pathname === '/student-portal') {
      localStorage.setItem('student_presigned_token', token);
    }
  }, [token]);

  useEffect(() => {
    if (schoolIdParam) {
      localStorage.setItem('student_school_id', schoolIdParam);
    }
  }, [schoolIdParam]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  // Assignment attempts state with localStorage fallback
  const [assignmentAttempts, setAssignmentAttempts] = useState<Record<string, AssignmentAttempt>>(() => {
    try {
      const cached = localStorage.getItem('student_assignment_attempts');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {};
  });
  const [loadingAttempts, setLoadingAttempts] = useState<Record<string, boolean>>({});
  const { setSubmission } = useSubmissionStore();
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  // Custom assignment modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [currentCustomAssignment, setCurrentCustomAssignment] = useState<any>(null);
  const [customAnswers, setCustomAnswers] = useState<any[]>([]);
  const [customScore, setCustomScore] = useState<number | null>(null);
  const [customCompleted, setCustomCompleted] = useState(false);
  
  // Question paper state
  const [showQuestionPaperModal, setShowQuestionPaperModal] = useState(false);
  const [currentQuestionPaper, setCurrentQuestionPaper] = useState<any>(null);
  const [questionPaperAnswers, setQuestionPaperAnswers] = useState<Record<number, string | number>>({});
  const [questionPaperAttachments, setQuestionPaperAttachments] = useState<Record<number, File | null>>({});
  const [questionPaperAttachmentReady, setQuestionPaperAttachmentReady] = useState<Record<number, boolean>>({});
  const [loadingQuestionPaper, setLoadingQuestionPaper] = useState(false);
  const [isSubmittingQuestionPaper, setIsSubmittingQuestionPaper] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);

  // FIX 1 & 4: Explicitly reset all modal states on component mount and clear persisted state
  useEffect(() => {
    // Clear any persisted modal state from localStorage/sessionStorage
    try {
      localStorage.removeItem('modal_open_state');
      sessionStorage.removeItem('modal_open_state');
      sessionStorage.removeItem('showGameModal');
      sessionStorage.removeItem('showCustomModal');
      sessionStorage.removeItem('showQuestionPaperModal');
    } catch (error) {
      console.warn('Failed to clear persisted modal state:', error);
    }

    // Explicitly reset all modal states to closed on mount
    setShowGameModal(false);
    setShowCustomModal(false);
    setShowQuestionPaperModal(false);
    setCurrentGame(null);
    setCurrentCustomAssignment(null);
    setCurrentQuestionPaper(null);
    setQuestionPaperAnswers({});
    setQuestionPaperAttachments({});
    setLoadingQuestionPaper(false);
    setIsSubmittingQuestionPaper(false);
    
    console.log('✅ Modal states explicitly reset on component mount');
  }, []); // Only run once on mount

  // Load question paper for an assignment
  const loadQuestionPaper = async (questionPaperId: string) => {
    setLoadingQuestionPaper(true);
    try {
      // First try localStorage
      const cachedPapers = localStorage.getItem('question_papers');
      if (cachedPapers) {
        const papers = JSON.parse(cachedPapers);
        const paper = papers.find((p: any) => p.id === questionPaperId);
        if (paper) {
          console.log('✅ Found question paper in localStorage:', paper);
          return paper;
        }
      }

      // Try fetching from Supabase
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabasePublishableKey();
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabaseClient
        .from('question_papers')
        .select('*')
        .eq('id', questionPaperId)
        .single();

      if (error) {
        console.error('Failed to load question paper:', error);
        throw error;
      }

      console.log('✅ Loaded question paper from Supabase:', data);
      return data;
    } catch (error) {
      console.error('Error loading question paper:', error);
      //toast.error('Failed to load question paper');
      return null;
    } finally {
      setLoadingQuestionPaper(false);
    }
  };

  // Start an assignment with question paper
  const startAssignmentWithQuestionPaper = async (assignment: any) => {
    console.log('🎯 Starting assignment with question paper:', {
      assignmentId: assignment.id,
      title: assignment.title,
      questionPaperId: assignment.question_paper_id,
      assignmentType: assignment.assignment_type
    });

    if (!assignment.question_paper_id) {
      console.error('❌ Assignment missing question_paper_id');
      toast.error('This assignment does not have a question paper assigned');
      return;
    }

    // FIX 3: Prevent race condition - Check if modal is already opening/open
    if (loadingQuestionPaper || showQuestionPaperModal) {
      console.warn('⚠️ Question paper modal already opening/open, ignoring duplicate request');
      return;
    }

    try {
      // STEP 1: Open modal immediately with loading state
      console.log('📄 STEP 1: Loading question paper...');
      // Reset all states first before opening
      setQuestionPaperAnswers({});
      setQuestionPaperAttachments({});
      setQuestionPaperAttachmentReady({});
      setIsSubmittingQuestionPaper(false);
      setSubmissionProgress(0);
      // Then open modal with loading state
      setLoadingQuestionPaper(true);
      setCurrentQuestionPaper({ assignment });
      // Small delay to ensure state is set before opening modal
      await new Promise(resolve => setTimeout(resolve, 50));
      setShowQuestionPaperModal(true);
      toast.info('Loading question paper...', { duration: 2000 });
      
      const paper = await loadQuestionPaper(assignment.question_paper_id);
      
      if (!paper) {
        console.error('❌ Failed to load question paper');
        toast.error('Could not load question paper. Please try again.');
        setLoadingQuestionPaper(false);
        return;
      }

      if (!paper.questions || paper.questions.length === 0) {
        console.error('❌ Question paper has no questions');
        toast.error('This question paper has no questions');
        setLoadingQuestionPaper(false);
        return;
      }

      console.log('✅ Question paper loaded successfully:', {
        paperId: paper.id,
        title: paper.title,
        questionsCount: paper.questions.length,
        totalMarks: paper.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)
      });

      // STEP 2: Show the modal IMMEDIATELY with the loaded question paper
      console.log('🎨 STEP 2: Opening question paper modal...');
      setCurrentQuestionPaper({ ...paper, assignment });
      setQuestionPaperAnswers({});
      setQuestionPaperAttachments({});
      setLoadingQuestionPaper(false);
      
      console.log('✅ Modal opened with', paper.questions.length, 'questions');
      toast.success(`Question paper ready: ${paper.questions.length} questions`, { duration: 3000 });

      // STEP 3: Start the assignment attempt in the background (don't block modal)
      console.log('💾 STEP 3: Starting assignment attempt in background...');
      startAssignment(assignment.id).then(() => {
        console.log('✅ Assignment attempt recorded in database');
      }).catch((error) => {
        console.error('⚠️ Failed to record assignment attempt:', error);
        // Don't block the user - they can still see and answer questions
      });
      
    } catch (error) {
      console.error('❌ Error starting assignment with question paper:', error);
      toast.error('Failed to start assignment. Please try again.');
      setLoadingQuestionPaper(false);
      setShowQuestionPaperModal(false);
    }
  };

  const restoreResubmitAttemptIfNeeded = (assignmentId?: string | null) => {
    if (!assignmentId) return;
    const snapshot = resubmitAttemptSnapshotRef.current[assignmentId];
    if (!snapshot) return;
    resubmitAttemptOverrideRef.current[assignmentId] = snapshot;
    setAssignmentAttempts(prev => {
      const updated = { ...prev, [assignmentId]: snapshot };
      try {
        localStorage.setItem('student_assignment_attempts', JSON.stringify(updated));
      } catch {
        // Ignore localStorage failures
      }
      return updated;
    });
    delete resubmitAttemptSnapshotRef.current[assignmentId];
  };

  // Handle answer change for question paper
  const handleQuestionPaperAnswerChange = (questionIndex: number, answer: string | number) => {
    setQuestionPaperAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleQuestionPaperAttachmentChange = (questionIndex: number, file: File | null) => {
    setQuestionPaperAttachments(prev => ({
      ...prev,
      [questionIndex]: file
    }));

    if (!file) {
      setQuestionPaperAttachmentReady(prev => ({
        ...prev,
        [questionIndex]: false,
      }));
      return;
    }

    setQuestionPaperAttachmentReady(prev => ({
      ...prev,
      [questionIndex]: false,
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setQuestionPaperAttachmentReady(prev => ({
        ...prev,
        [questionIndex]: true,
      }));
    };
    reader.onerror = () => {
      setQuestionPaperAttachmentReady(prev => ({
        ...prev,
        [questionIndex]: false,
      }));
      toast.error('File upload failed. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleQuestionPaperModalChange = (open: boolean) => {
    // FIX 3: Prevent closing while loading or submitting
    if (!open && (loadingQuestionPaper || isSubmittingQuestionPaper)) {
      console.warn('⚠️ Cannot close modal while loading or submitting');
      return;
    }
    
    if (!open) {
      // FIX 3: Clear all states atomically to prevent race conditions
      console.log('🔒 Closing question paper modal and clearing all states');
      restoreResubmitAttemptIfNeeded(currentQuestionPaper?.assignment?.id);
      setShowQuestionPaperModal(false);
      setCurrentQuestionPaper(null);
      setQuestionPaperAnswers({});
      setQuestionPaperAttachments({});
      setQuestionPaperAttachmentReady({});
      setLoadingQuestionPaper(false);
      setIsSubmittingQuestionPaper(false);
      setSubmissionProgress(0);
      return;
    }
    
    // FIX 3: Only allow opening if not already open
    if (!showQuestionPaperModal) {
      console.log('📖 Opening question paper modal');
      setShowQuestionPaperModal(true);
    }
  };

  // Submit question paper answers
  const submitQuestionPaper = async () => {
    if (!currentQuestionPaper) return;
    if (isSubmittingQuestionPaper) return;

    setIsSubmittingQuestionPaper(true);
    setSubmissionProgress(15);

    const questions = currentQuestionPaper.questions || [];
    const assignment = currentQuestionPaper.assignment;
    
    let score = 0;
    let totalMarks = 0;

    // Calculate score based on question types
    questions.forEach((q: any, idx: number) => {
      const questionMarks = q.marks || 1;
      totalMarks += questionMarks;

      const studentAnswer = questionPaperAnswers[idx];

      if (q.type === 'multiple-choice' && q.answer !== undefined) {
        // MCQ: Check if selected option matches correct answer
        if (Number(studentAnswer) === Number(q.answer)) {
          score += questionMarks;
        }
      } else if (q.type === 'subjective') {
        // Subjective: Award partial marks (teacher will grade later)
        // For now, give full marks if student provided an answer
        const answerText = typeof studentAnswer === 'string' ? stripHtml(studentAnswer) : String(studentAnswer || '');
        if (answerText.trim().length > 0) {
          score += questionMarks * 0.5; // 50% for attempt
        }
      }
    });

    const percentageScore = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    setSubmissionProgress(35);

    const subjectiveText = questions
      .map((q: any, idx: number) => (q.type === 'subjective' ? stripHtml(String(questionPaperAnswers[idx] || '')) : ''))
      .filter((value: string) => value.trim().length > 0)
      .join('\n\n');

    // Submit the assignment with answers
    await completeAssignment(assignment.id, percentageScore, {
      question_paper_id: currentQuestionPaper.id,
      answers: questionPaperAnswers,
      attachments_meta: Object.entries(questionPaperAttachments).reduce((acc, [key, file]) => {
        if (file) {
          acc[key] = { name: file.name, type: file.type, size: file.size };
        }
        return acc;
      }, {} as Record<string, { name: string; type: string; size: number }>),
      questions_attempted: Object.keys(questionPaperAnswers).length,
      total_questions: questions.length,
      raw_score: score,
      total_marks: totalMarks,
      submitted_at: new Date().toISOString()
    });
    setSubmissionProgress(60);

    const attachmentKeys = Object.keys(questionPaperAttachments)
      .map((key) => Number(key))
      .filter((key) => !Number.isNaN(key))
      .sort((a, b) => a - b);
    const lastAttachmentKey = attachmentKeys.reverse().find((key) => questionPaperAttachments[key]);
    const lastAttachment = lastAttachmentKey !== undefined ? questionPaperAttachments[lastAttachmentKey] : null;

    if ((subjectiveText || lastAttachment) && assignment?.id && studentData?.id) {
      try {
        const schoolId =
          schoolIdParam ||
          studentData?.school_id ||
          localStorage.getItem('student_school_id') ||
          '';
        if (!schoolId) {
          toast.error('Missing school ID for AI feedback. Please refresh or contact support.');
          return;
        }

        const formData = new FormData();
        formData.append('student_id', studentData.id);
        formData.append('assignment_id', assignment.id);
        formData.append('school_id', schoolId);
        if (assignment.grade) formData.append('grade_level', assignment.grade);
        formData.append('subject', assignment.title || 'Assignment');
        formData.append('rubric', aiAssessmentSettings.rubric);
        formData.append('max_score', String(aiAssessmentSettings.maxScore));
        formData.append('language', aiAssessmentSettings.language);
        formData.append('submission_text', subjectiveText || 'Submitted via file upload.');

        if (lastAttachment) {
          formData.append('image', lastAttachment);
        }

        const response = await fetch(
          `${aiAssessmentSettings.apiBaseUrl}/api/v1/assignments/assess`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
            body: formData,
          }
        );
        setSubmissionProgress(80);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'AI feedback failed');
        }

        const submission = await response.json();
        let aiSubmissionId =
          (submission?.submission_id || submission?.submissionId || submission?.id) as string | undefined;
        if (!aiSubmissionId) {
          aiSubmissionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          console.warn('AI response missing submission id. Generated local id:', aiSubmissionId);
        }
        setSubmission({
          id: aiSubmissionId,
          assignmentId: assignment.id,
          studentId: studentData.id,
          submittedAt: new Date().toISOString(),
          inputMode: 'text',
          text: subjectiveText,
          feedback: submission.feedback || submission.data?.feedback || submission.ai_feedback,
        });
        try {
          const raw = localStorage.getItem('student_ai_submission_map');
          const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
          map[assignment.id] = aiSubmissionId;
          localStorage.setItem('student_ai_submission_map', JSON.stringify(map));
        } catch {
          // Ignore localStorage failures
        }

        setAssignmentAttempts(prev => {
          const current = prev[assignment.id];
          const baseAttempt = current || {
            id: `ai-${assignment.id}`,
            assignment_id: assignment.id,
            student_id: studentData.id,
            status: 'submitted' as const,
            attempts_count: 1,
            score: percentageScore,
            submission_data: {},
          };
          const updatedAttempt = {
            ...baseAttempt,
            ai_submission_id: aiSubmissionId,
            submission_data: {
              ...(baseAttempt.submission_data || {}),
              ai_submission_id: aiSubmissionId,
            },
          };
          const updated = { ...prev, [assignment.id]: updatedAttempt };
          localStorage.setItem('student_assignment_attempts', JSON.stringify(updated));
          return updated;
        });

        try {
          await loadAssignmentAttempts();
        } catch (refreshError) {
          console.warn('Failed to refresh assignment attempts:', refreshError);
        }
        setSubmissionProgress(95);
      } catch (error) {
        console.warn('AI feedback submission failed:', error);
        toast.error('AI feedback is not available right now.');
      }
    }

    setSubmissionProgress(100);
    toast.success(`Assignment submitted! Score: ${percentageScore}% (${score}/${totalMarks} marks)`);
    setShowQuestionPaperModal(false);
    setCurrentQuestionPaper(null);
    setQuestionPaperAnswers({});
    setQuestionPaperAttachments({});
    setSubmissionProgress(0);
    setIsSubmittingQuestionPaper(false);
  };

  // Start a custom assignment (question paper) - keep for backward compatibility
  const startCustomAssignment = (assignment: any) => {
    setCurrentCustomAssignment(assignment);
    setCustomAnswers(Array.isArray(assignment.questions) ? Array(assignment.questions.length).fill('') : []);
    setCustomScore(null);
    setCustomCompleted(false);
    setShowCustomModal(true);
    toast.success(`Starting ${assignment.title}!`);
  };

  // Handle answer change for custom assignment
  const handleCustomAnswerChange = (idx: number, value: string) => {
    setCustomAnswers((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  // Submit custom assignment answers
  const submitCustomAssignment = () => {
    if (!currentCustomAssignment) return;
    const questions = currentCustomAssignment.questions || [];
    let score = 0;
    let maxScore = questions.length;
    // Score calculation: compare answer index or text
    questions.forEach((q: any, idx: number) => {
      if (q.answer !== undefined && q.options) {
        // MCQ: check if selected option index matches
        if (String(q.answer) === String(customAnswers[idx])) score++;
      } else if (q.answer !== undefined) {
        // Text: check if answer matches (case-insensitive)
        if ((customAnswers[idx] || '').trim().toLowerCase() === String(q.answer).trim().toLowerCase()) score++;
      } else {
        // No answer key, skip scoring
        maxScore--;
      }
    });
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
    setCustomScore(percent);
    setCustomCompleted(true);
    // Mark assignment as complete
    if (currentCustomAssignment.id) {
      completeAssignment(currentCustomAssignment.id, percent, {
        answers: customAnswers,
        completedAt: new Date().toISOString(),
      });
    }
    toast.success(`Assignment submitted! Score: ${percent}%`);
    setShowCustomModal(false);
  };
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const subscriptionRef = useRef<any>(null);
  const studentDataRef = useRef<StudentData | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Load assignment attempts for the student
  const loadAssignmentAttempts = useCallback(async () => {
    if (!token || !studentData) return;
    try {
      const supabaseUrl = getSupabaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(
        `${supabaseUrl}/functions/v1/assignment-attempts?token=${token}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        const attempts = await response.json();
        const attemptsMap: Record<string, AssignmentAttempt> = {};
        let aiSubmissionMap: Record<string, string> = {};
        try {
          const raw = localStorage.getItem('student_ai_submission_map');
          aiSubmissionMap = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        } catch {
          aiSubmissionMap = {};
        }
        attempts.forEach((attempt: AssignmentAttempt) => {
          const mappedSubmissionId = aiSubmissionMap[attempt.assignment_id];
          const mergedAttempt = mappedSubmissionId && !attempt.ai_submission_id
            ? {
                ...attempt,
                ai_submission_id: mappedSubmissionId,
                submission_data: {
                  ...(attempt.submission_data || {}),
                  ai_submission_id: mappedSubmissionId,
                },
              }
            : attempt;
          const override = resubmitAttemptOverrideRef.current[attempt.assignment_id];
          if (override && (mergedAttempt.status === 'in_progress' || mergedAttempt.status === 'not_started')) {
            attemptsMap[attempt.assignment_id] = override;
          } else {
            if (override && (mergedAttempt.status === 'completed' || mergedAttempt.status === 'submitted')) {
              delete resubmitAttemptOverrideRef.current[attempt.assignment_id];
            }
            attemptsMap[attempt.assignment_id] = mergedAttempt;
          }
        });
        setAssignmentAttempts(attemptsMap);
        // Save to localStorage for fallback
        localStorage.setItem('student_assignment_attempts', JSON.stringify(attemptsMap));
        console.log('Loaded assignment attempts from server');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // On error, keep state and do not clear localStorage
      console.warn('Assignment attempts not available, using cached state:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [token, studentData]);

  // Keep studentDataRef in sync with studentData
  useEffect(() => {
    studentDataRef.current = studentData;
    if (studentData) {
      loadAssignmentAttempts();
    }
  }, [studentData, loadAssignmentAttempts]);

  useEffect(() => {
    if (resubmitHandledRef.current) return;
    if (!resubmitAssignmentId || !studentData) return;

    const assignment = studentData.assignments.find((item) => item.id === resubmitAssignmentId);
    if (!assignment) return;

    resubmitHandledRef.current = true;
    const currentAttempt = assignmentAttempts[assignment.id];
    if (currentAttempt) {
      resubmitAttemptSnapshotRef.current[assignment.id] = currentAttempt;
    }
    if (assignment.question_paper_id) {
      startAssignmentWithQuestionPaper(assignment);
    } else if (assignment.assignment_type === 'game') {
      startAssignment(assignment.id)
        .catch((error) => {
          console.warn('Failed to record game resubmit attempt:', error);
        })
        .finally(() => {
          playGame(assignment);
        });
    } else {
      startAssignment(assignment.id);
    }
  }, [resubmitAssignmentId, studentData, assignmentAttempts]);

  // Load student data function (defined early for use in effects)
  const loadStudentData = useCallback(async (accessToken: string) => {
    try {
      if (!hasLoadedRef.current) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Enable mock data for testing when function is not deployed
      // Remove this block once the Supabase function is deployed
      const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true' || accessToken === 'demo';
      
      if (useMockData) {
        console.log('Using mock data for testing');
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: StudentData = {
          id: 'mock-student-1',
          school_id: 'mock-school-1',
          name: 'Demo Student',
          email: 'demo.student@example.com',
          primary_language: 'English',
          rooms: [
            {
              id: 'mock-room-1',
              name: 'Mathematics 101',
              description: 'Introduction to Algebra',
              grade_level: '9'
            },
            {
              id: 'mock-room-2',
              name: 'English Literature',
              description: 'Classic Literature Studies',
              grade_level: '9'
            }
          ],
          assignments: [
            {
              id: 'mock-assignment-1',
              title: 'Algebra Homework',
              description: 'Complete exercises 1-15 on page 42',
              due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
              status: 'active',
              room_id: 'mock-room-1'
            },
            {
              id: 'mock-assignment-2',
              title: 'Essay: Romeo and Juliet',
              description: 'Write a 500-word essay about the themes in Romeo and Juliet',
              due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
              status: 'active',
              room_id: 'mock-room-2'
            }
          ],
          classmates: [
            {
              id: 'mock-student-2',
              name: 'Alice Johnson',
              email: 'alice.j@example.com',
              primary_language: 'English',
              rooms: [
                {
                  id: 'mock-room-1',
                  name: 'Mathematics 101',
                  description: 'Introduction to Algebra',
                  grade_level: '9'
                }
              ],
              shared_room_count: 1
            },
            {
              id: 'mock-student-3',
              name: 'Bob Smith',
              email: 'bob.s@example.com',
              primary_language: 'Spanish',
              rooms: [
                {
                  id: 'mock-room-2',
                  name: 'English Literature',
                  description: 'Classic Literature Studies',
                  grade_level: '9'
                }
              ],
              shared_room_count: 1
            }
          ]
        };
        
        setStudentData(mockData);
        if (mockData.school_id) {
          localStorage.setItem('student_school_id', mockData.school_id);
        }
        setError(null);
        toast.success('Loaded demo data successfully');
        return;
      }

      const supabaseUrl = getSupabaseUrl();
      console.log('Attempting to fetch student data from:', `${supabaseUrl}/functions/v1/student-portal?token=${accessToken}`);
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/student-portal?token=${accessToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Check if response is HTML (error page) vs JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          const htmlText = await response.text();
          console.error('HTML response received:', htmlText.substring(0, 500));
          throw new Error(`Server error (${response.status}): The student-portal function appears to be unavailable. Try using token "demo" for testing, or ensure the function is deployed to Supabase.`);
        }
        
        // Try to get error message from JSON response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`Server error: ${response.status} - ${response.statusText}`);
        }
      }

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 500));
        throw new Error('Server returned invalid response format. The student-portal function may not be properly deployed. Try using token "demo" for testing.');
      }

      const data = await response.json();
      console.log('Successfully loaded student data:', data);
      console.log('📊 Assignments received:', data.assignments?.length || 0);
      if (data.school_id) {
        localStorage.setItem('student_school_id', data.school_id);
      }

      const assignmentsCacheKey = `student_assignments_cache_${data.id}`;
      if (Array.isArray(data.assignments) && data.assignments.length > 0) {
        try {
          localStorage.setItem(assignmentsCacheKey, JSON.stringify(data.assignments));
        } catch {
          // Ignore localStorage failures
        }
      } else {
        try {
          const cached = localStorage.getItem(assignmentsCacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              data.assignments = parsed;
              console.warn('Using cached assignments because server returned empty list.');
            }
          }
        } catch {
          // Ignore cache issues
        }
      }
      
      // DETAILED LOGGING - BEFORE ENRICHMENT
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  📋 ASSIGNMENTS DATA - BEFORE ENRICHMENT                   ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      data.assignments?.forEach((assignment: any, index: number) => {
        console.log(`\n📌 Assignment ${index + 1}: ${assignment.title}`);
        console.log(`   ID: ${assignment.id}`);
        console.log(`   Type: ${assignment.assignment_type || 'NOT SET'}`);
        console.log(`   Question Paper ID: ${assignment.question_paper_id || 'NULL/UNDEFINED'}`);
        console.log(`   Has Question Paper?: ${!!assignment.question_paper_id ? '✅ YES' : '❌ NO'}`);
        console.log(`   Grade: ${assignment.grade || 'NOT SET'}`);
        console.log(`   Game ID: ${assignment.games?.id || 'N/A'}`);
        console.log(`   Game Name: ${assignment.games?.name || 'N/A'}`);
        console.log(`   Status: ${assignment.status}`);
        console.log(`   ${'─'.repeat(60)}`);
      });
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Enrich assignments with missing question_paper_id from DB (fallback)
      if (Array.isArray(data.assignments)) {
        const needsEnrichment = data.assignments.filter((a: any) => !a.question_paper_id);
        if (needsEnrichment.length > 0) {
          try {
            console.log('🩹 Enrichment: fetching question_paper_id for', needsEnrichment.length, 'assignments');
            const supabaseUrl = getSupabaseUrl();
            const supabaseKey = getSupabasePublishableKey();
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseClient = createClient(supabaseUrl, supabaseKey);

            const ids = needsEnrichment.map((a: any) => a.id);
            const { data: assignRows, error: assignErr } = await supabaseClient
              .from('assignments')
              .select('id, question_paper_id, assignment_type, grade')
              .in('id', ids);

            if (assignErr) {
              console.warn('⚠️ Enrichment fetch error:', assignErr);
            } else if (Array.isArray(assignRows)) {
              const rowMap = Object.fromEntries(assignRows.map(r => [r.id, r]));
              data.assignments = data.assignments.map((a: any) => {
                const row = rowMap[a.id];
                if (row) {
                  return {
                    ...a,
                    question_paper_id: a.question_paper_id ?? row.question_paper_id ?? undefined,
                    assignment_type: a.assignment_type ?? row.assignment_type ?? undefined,
                    grade: a.grade ?? row.grade ?? undefined,
                  };
                }
                return a;
              });
              console.log('✅ Enrichment complete.');
              
              // DETAILED LOGGING - AFTER ENRICHMENT
              console.log('\n╔════════════════════════════════════════════════════════════╗');
              console.log('║  📋 ASSIGNMENTS DATA - AFTER ENRICHMENT                    ║');
              console.log('╚════════════════════════════════════════════════════════════╝');
              data.assignments?.forEach((assignment: any, index: number) => {
                console.log(`\n📌 Assignment ${index + 1}: ${assignment.title}`);
                console.log(`   ID: ${assignment.id}`);
                console.log(`   Type: ${assignment.assignment_type || 'NOT SET'}`);
                console.log(`   Question Paper ID: ${assignment.question_paper_id || 'NULL/UNDEFINED'}`);
                console.log(`   Has Question Paper?: ${!!assignment.question_paper_id ? '✅ YES' : '❌ NO - WILL ONLY SHOW TOAST!'}`);
                console.log(`   Grade: ${assignment.grade || 'NOT SET'}`);
                console.log(`   ${'─'.repeat(60)}`);
              });
              console.log('╚════════════════════════════════════════════════════════════╝\n');
            }
          } catch (enrichError) {
            console.warn('⚠️ Enrichment process failed:', enrichError);
            console.error('⚠️ This means question_paper_id will be null!');
            console.error('⚠️ Check if columns exist in database!');
          }
        }
      }

      // FINAL DATA LOGGING - What will be used by UI
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  🎯 FINAL DATA - What UI Will Receive                     ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      data.assignments?.forEach((assignment: any, index: number) => {
        const willOpenModal = !!assignment.question_paper_id;
        console.log(`\n${willOpenModal ? '✅' : '❌'} Assignment ${index + 1}: ${assignment.title}`);
        console.log(`   question_paper_id: ${assignment.question_paper_id || 'NULL'}`);
        console.log(`   Will open modal?: ${willOpenModal ? '✅ YES' : '❌ NO - Only toast'}`);
      });
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      setStudentData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load student data:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load student data';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error: Cannot connect to the server. Please check your internet connection.';
      } else if (err instanceof SyntaxError && err.message.includes('JSON')) {
        errorMessage = 'Server configuration error: The student-portal function is not properly set up. Try using token "demo" for testing.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      hasLoadedRef.current = true;
    }
  }, []); // Empty deps - function is stable


  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabasePublishableKey();
    
    console.log('Initializing Supabase client...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');
    
    supabaseRef.current = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    
    console.log('✅ Supabase client initialized');
    
    // Test Realtime connection
    console.log('Testing Realtime connection...');
    const testChannel = supabaseRef.current.channel('connection-test');
    testChannel.subscribe((status) => {
      console.log('Test channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime is working! Unsubscribing test channel...');
        supabaseRef.current?.removeChannel(testChannel);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime connection test failed!');
        console.error('This may mean:');
        console.error('1. Realtime is not enabled in Supabase project settings');
        console.error('2. Tables are not added to supabase_realtime publication');
        console.error('3. Network/firewall blocking WebSocket connections');
      }
    });
    
    return () => {
      if (testChannel) {
        supabaseRef.current?.removeChannel(testChannel);
      }
    };
  }, []);

  // Load initial data
  useEffect(() => {
    if (token) {
      loadStudentData(token);
    } else {
      setError('No access token provided');
      setLoading(false);
    }
  }, [token, loadStudentData]);

  // Setup Realtime subscription function (can be called for reconnection)
  const setupRealtimeSubscription = useCallback(() => {
    if (!studentData?.id || !supabaseRef.current) {
      console.log('Cannot setup subscription: missing studentData or supabase client');
      return null;
    }

    console.log('=== SETTING UP REALTIME SUBSCRIPTION ===');
    console.log('Student ID:', studentData.id);
    console.log('Student name:', studentData.name);
    console.log('Current rooms:', studentData.rooms.map(r => ({ id: r.id, name: r.name })));

    // Use unique channel name with timestamp to avoid conflicts on reconnection
    const channelName = `student-portal-${studentData.id}-${Date.now()}`;
    console.log('Creating channel:', channelName);

    // Subscribe to ALL assignment changes, room_students changes, and filter client-side
    // This is more reliable than server-side filtering
    const channel = supabaseRef.current
      .channel(channelName)
      // INSERT
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('🔔 Assignment INSERT detected:', payload);
          const newAssignment = payload.new as StudentData['assignments'][0];
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(newAssignment.room_id)) {
            console.log('❌ Assignment not for student rooms, ignoring');
            return;
          }
          setStudentData(prev => {
            if (!prev) return prev;
            if (prev.assignments.some(a => a.id === newAssignment.id)) {
              console.log('⚠️ Assignment already exists, skipping duplicate');
              return prev;
            }
            return {
              ...prev,
              assignments: [...prev.assignments, newAssignment]
            };
          });
          const currentData = studentDataRef.current;
          const room = currentData?.rooms.find(r => r.id === newAssignment.room_id);
          toast.success(
            `New Assignment: ${newAssignment.title}`,
            {
              description: room ? `Posted in ${room.name}` : 'New assignment available',
              duration: 5000,
            }
          );
          console.log('✅ Assignment added successfully!');
        }
      )
      // UPDATE
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('🔄 Assignment UPDATE detected:', payload);
          const updatedAssignment = payload.new as StudentData['assignments'][0];
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(updatedAssignment.room_id)) {
            console.log('❌ Assignment not for student rooms, ignoring');
            return;
          }
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.map(a => a.id === updatedAssignment.id ? updatedAssignment : a)
            };
          });
          toast.info(`Assignment updated: ${updatedAssignment.title}`);
        }
      )
      // DELETE
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('🗑️ Assignment DELETE detected:', payload);
          const deletedAssignment = payload.old as StudentData['assignments'][0];
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.filter(a => a.id !== deletedAssignment.id)
            };
          });
          toast.info(`Assignment deleted: ${deletedAssignment.title}`);
        }
      )
      // NEW STUDENT ADDED TO ROOM
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_students'
        },
        (payload) => {
          console.log('👤 New student added to room:', payload);
          const newRoomStudent = payload.new;
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          // Only reload if the new student is added to one of our rooms
          if (currentRoomIds.includes(newRoomStudent.room_id)) {
            console.log('🔄 Reloading student data for new classmate...');
            if (token) {
              loadStudentData(token);
              toast.info('A new student joined your classroom!', { duration: 3000 });
            }
          } else {
            console.log('New student not in our rooms, ignoring');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment UPDATE detected:', payload);
          const updatedAssignment = payload.new as StudentData['assignments'][0];
          
          // Get current room IDs from ref (always up-to-date)
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this assignment is for one of the student's rooms
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(updatedAssignment.room_id)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('Assignment update for student! Updating list...');
          
          // Update the assignment in the list
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.map(a => 
                a.id === updatedAssignment.id ? updatedAssignment : a
              )
            };
          });

          toast.info('An assignment was updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'assignments'
        },
        (payload) => {
          console.log('Assignment DELETE detected:', payload);
          const deletedId = payload.old.id;
          const deletedRoomId = payload.old.room_id;
          
          // Get current room IDs from ref (always up-to-date)
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this assignment was for one of the student's rooms
          if (currentRoomIds.length > 0 && !currentRoomIds.includes(deletedRoomId)) {
            console.log('Assignment not for student rooms, ignoring');
            return;
          }

          console.log('Assignment deletion for student! Removing from list...');
          
          // Remove the assignment from the list
          setStudentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: prev.assignments.filter(a => a.id !== deletedId)
            };
          });

          toast.info('An assignment was removed');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_students'
        },
        (payload) => {
          console.log('room_students change detected:', payload);
          console.log('Event type:', payload.eventType);
          
          // Type the payload data
          const newRecord = payload.new as { student_id?: string; room_id?: string } | null;
          const oldRecord = payload.old as { student_id?: string; room_id?: string } | null;
          
          const currentStudentId = studentDataRef.current?.id;
          const currentRoomIds = studentDataRef.current?.rooms.map(r => r.id) || [];
          
          // Check if this involves the current student
          const isForStudent = newRecord?.student_id === currentStudentId || 
                               oldRecord?.student_id === currentStudentId;
          
          // Also check if it's a student being added to one of our rooms (new classmate)
          const isInOurRooms = currentRoomIds.length > 0 && (
            (newRecord?.room_id && currentRoomIds.includes(newRecord.room_id)) || 
            (oldRecord?.room_id && currentRoomIds.includes(oldRecord.room_id))
          );
          
          if (!isForStudent && !isInOurRooms) {
            console.log('room_students change not relevant, ignoring');
            return;
          }

          console.log('Room assignment change detected! Reloading student data...');
          
          // Reload the entire student data to get updated rooms and classmates
          if (token) {
            loadStudentData(token);
            
            if (isForStudent) {
              toast.info('Your classroom assignments have been updated', { duration: 3000 });
            } else {
              toast.info('A new classmate joined your classroom', { duration: 3000 });
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('=== SUBSCRIPTION STATUS UPDATE ===');
        console.log('Status:', status);
        console.log('Error:', err);
        console.log('Channel name:', channelName);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to portal updates!');
          console.log('📡 Listening for:');
          console.log('  - assignments INSERT');
          console.log('  - assignments UPDATE');
          console.log('  - assignments DELETE');
          console.log('  - room_students ALL events');
          console.log('=================================');
          
          setRealtimeConnected(true);
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
          toast.success('Live updates connected!', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to portal updates');
          console.error('Error details:', err);
          setRealtimeConnected(false);
          toast.error('Live updates connection failed');
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out');
          setRealtimeConnected(false);
          attemptReconnect();
        } else if (status === 'CLOSED') {
          console.log('🔌 Subscription closed');
          setRealtimeConnected(false);
          // Don't reconnect on intentional close (like unmount)
        }
      });

    return channel;
  }, [studentData?.id, token, loadStudentData]);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      toast.error('Unable to connect to live updates. Please refresh the page.', { duration: 5000 });
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000); // Max 10 seconds

    console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      console.log('Executing reconnection attempt...');
      
      // Clean up old subscription properly
      if (subscriptionRef.current && supabaseRef.current) {
        console.log('Removing old channel...');
        await supabaseRef.current.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create new subscription
      const newChannel = setupRealtimeSubscription();
      if (newChannel) {
        subscriptionRef.current = newChannel;
        console.log('New channel created and stored');
      } else {
        console.error('Failed to create new channel');
      }
    }, delay);
  }, [setupRealtimeSubscription]);

  // Setup Realtime subscription for assignments and room changes
  useEffect(() => {
    const channel = setupRealtimeSubscription();
    if (channel) {
      subscriptionRef.current = channel;
    }

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Realtime subscription');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        supabaseRef.current?.removeChannel(subscriptionRef.current);
      }
    };
  }, [setupRealtimeSubscription]);

  // Handle page visibility changes (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('📱 Page went to background');
      } else {
        console.log('📱 Page came to foreground');
        
        // Check if connection is lost and reconnect
        if (!realtimeConnected && studentData?.id && supabaseRef.current) {
          console.log('Reconnecting after returning to foreground...');
          reconnectAttemptsRef.current = 0; // Reset attempts when manually reconnecting
          
          // Clean up old subscription
          if (subscriptionRef.current) {
            await supabaseRef.current.removeChannel(subscriptionRef.current);
            subscriptionRef.current = null;
          }

          // Wait a bit for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create new subscription
          const newChannel = setupRealtimeSubscription();
          if (newChannel) {
            subscriptionRef.current = newChannel;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [realtimeConnected, studentData?.id, setupRealtimeSubscription]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Network connection restored');
      toast.success('Internet connection restored', { duration: 2000 });
      
      // Reconnect WebSocket if needed
      if (!realtimeConnected && studentData?.id && supabaseRef.current) {
        console.log('Reconnecting after network restoration...');
        reconnectAttemptsRef.current = 0;
        
        if (subscriptionRef.current) {
          await supabaseRef.current.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const newChannel = setupRealtimeSubscription();
        if (newChannel) {
          subscriptionRef.current = newChannel;
        }
      }
      
      // Reload data to ensure we have latest
      if (token) {
        loadStudentData(token);
      }
    };

    const handleOffline = () => {
      console.log('🌐 Network connection lost');
      toast.error('Internet connection lost', { duration: 3000 });
      setRealtimeConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [realtimeConnected, studentData?.id, token, setupRealtimeSubscription, loadStudentData]);

  // Start an assignment attempt
  const startAssignment = async (assignmentId: string) => {
    if (!token) return;
    
    setLoadingAttempts(prev => ({ ...prev, [assignmentId]: true }));
    
    console.log('🚀 Starting assignment:', {
      assignmentId,
      studentId: studentData?.id,
      token: token.substring(0, 10) + '...'
    });
    
    // Create fallback attempt object
    const createMockAttempt = () => ({
      id: `mock-${assignmentId}`,
      assignment_id: assignmentId,
      student_id: studentData?.id || '',
      status: 'in_progress' as const,
      attempts_count: 1,
      started_at: new Date().toISOString()
    });
    
    // Try to use the backend function first
    let backendSuccess = false;
    try {
      const supabaseUrl = getSupabaseUrl();
      
      console.log('📡 Attempting to start assignment via backend API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/assignment-attempts?token=${token}&assignment_id=${assignmentId}&action=start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const attempt = await response.json();
        console.log('✅ Assignment started via backend API:', attempt);
        setAssignmentAttempts(prev => ({
          ...prev,
          [assignmentId]: attempt
        }));
        // Force-refresh student data to get latest assignment object
        if (token) {
          await loadStudentData(token);
        }
        toast.success('Assignment started! Good luck!');
        backendSuccess = true;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.warn('⚠️ Backend start failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
      
      // Try direct Supabase insert as fallback
      try {
        console.log('🔄 Attempting direct Supabase insert as fallback...');
        
        const supabaseUrl = getSupabaseUrl();
        const supabaseKey = getSupabasePublishableKey();
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        
        // Check for an existing attempt so we don't overwrite attempts_count during fallback
        const { data: existingAttempt, error: existingError } = await supabaseClient
          .from('assignment_attempts')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentData?.id)
          .single();

        let attemptsCount = 1;
        let upsertStatus: any = 'in_progress';

        if (!existingError && existingAttempt) {
          // If previously completed/submitted, increment attempts_count for a retry
          if (existingAttempt.status === 'completed' || existingAttempt.status === 'submitted') {
            attemptsCount = (existingAttempt.attempts_count || 0) + 1;
            upsertStatus = 'in_progress';
          } else if (existingAttempt.status === 'in_progress') {
            // Keep the current attempts_count if already in progress
            attemptsCount = existingAttempt.attempts_count || 1;
            upsertStatus = 'in_progress';
          } else {
            // from not_started -> start with 1
            attemptsCount = existingAttempt.attempts_count || 1;
            upsertStatus = 'in_progress';
          }
        }

        const { data: insertData, error: insertError } = await supabaseClient
          .from('assignment_attempts')
          .upsert({
            assignment_id: assignmentId,
            student_id: studentData?.id,
            status: upsertStatus,
            attempts_count: attemptsCount,
            started_at: new Date().toISOString()
          }, {
            onConflict: 'assignment_id,student_id'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Direct Supabase insert failed:', insertError);
          throw insertError;
        }
        
        console.log('✅ Assignment started via direct Supabase insert:', insertData);
        setAssignmentAttempts(prev => ({
          ...prev,
          [assignmentId]: insertData
        }));
        // Force-refresh student data to get latest assignment object
        if (token) {
          await loadStudentData(token);
        }
        toast.success('Assignment started! Good luck! (Direct save)');
        backendSuccess = true;
        
      } catch (supabaseError) {
        console.error('❌ Both backend and direct Supabase failed:', supabaseError);
        
        // Final fallback - local state only
        const mockAttempt = createMockAttempt();
        setAssignmentAttempts(prev => ({
          ...prev,
          [assignmentId]: mockAttempt
        }));
        toast.success('Assignment started! (Local tracking - please check with teacher)');
      }
    } finally {
      setLoadingAttempts(prev => ({ ...prev, [assignmentId]: false }));
      
      // Show final status
      if (backendSuccess) {
        console.log('🎉 Assignment start saved to database successfully!');
        toast.info('✅ Your progress is being tracked', { duration: 2000 });
      } else {
        console.log('⚠️ Assignment start may not be synced to teacher dashboard');
        toast.warning('⚠️ Progress saved locally - teacher may not see update immediately', { duration: 4000 });
      }
    }
  };

  // Complete an assignment attempt
  const completeAssignment = async (assignmentId: string, score?: number, submissionData?: any) => {
    if (!token) return;
    
    setLoadingAttempts(prev => ({ ...prev, [assignmentId]: true }));
    
    // Create fallback completed attempt
    const createCompletedAttempt = () => {
      const currentAttempt = assignmentAttempts[assignmentId];
      return {
        ...currentAttempt,
        id: currentAttempt?.id || `mock-${assignmentId}`,
        assignment_id: assignmentId,
        student_id: studentData?.id || '',
        status: 'submitted' as const,
        score: typeof score === 'number' ? score : 0,
        max_score: Math.max(currentAttempt?.max_score || 100, typeof score === 'number' ? score : 0),
        completed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        submission_data: submissionData,
        attempts_count: currentAttempt?.attempts_count || 1
      };
    };
    
    console.log('🎯 Completing assignment:', {
      assignmentId,
      score,
      submissionData,
      studentId: studentData?.id,
      token: token.substring(0, 10) + '...'
    });
    
    // Try to use the backend function first
    let backendSuccess = false;
    try {
      const supabaseUrl = getSupabaseUrl();
      
      console.log('📡 Attempting to complete assignment via backend API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/assignment-attempts?token=${token}&assignment_id=${assignmentId}&action=complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: typeof score === 'number' ? score : 0,
            submissionData,
            feedback: 'Assignment submitted'
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const attempt = await response.json();
        console.log('✅ Assignment completed via backend API:', attempt);
        setAssignmentAttempts(prev => {
          const updated = {
            ...prev,
            [assignmentId]: attempt
          };
          localStorage.setItem('student_assignment_attempts', JSON.stringify(updated));
          return updated;
        });
        toast.success('Assignment submitted successfully! 🎉');
        backendSuccess = true;
      } else {
        const errorText = await response.text();
        console.error('❌ Backend API error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.warn('⚠️ Backend completion failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
      
      // Try direct Supabase insert as fallback
      try {
        console.log('🔄 Attempting direct Supabase insert as fallback...');
        
        const completedAttempt = createCompletedAttempt();
        
        // Use direct Supabase client to ensure data is saved
        const supabaseUrl = getSupabaseUrl();
        const supabaseKey = getSupabasePublishableKey(); // Use correct project key for student operations
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(supabaseUrl, supabaseKey);
        
        const { data: insertData, error: insertError } = await supabaseClient
          .from('assignment_attempts')
          .upsert({
            assignment_id: assignmentId,
            student_id: studentData?.id,
            status: 'completed',
            score: typeof score === 'number' ? score : 0,
            max_score: typeof score === 'number' ? score : 0,
            attempts_count: completedAttempt.attempts_count,
            completed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            submission_data: submissionData,
            feedback: 'Assignment submitted'
          }, {
            onConflict: 'assignment_id,student_id'
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Direct Supabase insert failed:', insertError);
          throw insertError;
        }
        
        console.log('✅ Assignment completed via direct Supabase insert:', insertData);
        setAssignmentAttempts(prev => {
          const updated = {
            ...prev,
            [assignmentId]: { ...insertData, status: 'submitted' }
          };
          localStorage.setItem('student_assignment_attempts', JSON.stringify(updated));
          return updated;
        });
        
        toast.success('Assignment submitted successfully! 🎉 (Direct save)');
        backendSuccess = true;
        
      } catch (supabaseError) {
        console.error('❌ Both backend and direct Supabase failed:', supabaseError);
        
        // Final fallback - local state only
        const completedAttempt = createCompletedAttempt();
        setAssignmentAttempts(prev => {
          const updated = {
            ...prev,
            [assignmentId]: { ...completedAttempt, status: 'completed' as const }
          };
          localStorage.setItem('student_assignment_attempts', JSON.stringify(updated));
          return updated;
        });
        toast.success('Assignment submitted successfully! 🎉 (Local save - please check with teacher)');
      }
    } finally {
      setLoadingAttempts(prev => ({ ...prev, [assignmentId]: false }));

      // Always send a real-time broadcast to notify teachers to refresh progress
      if (backendSuccess) {
        console.log('🎉 Assignment submission saved to database successfully!');
        toast.info('✅ Progress has been saved and teacher will see the update', { duration: 3000 });

        try {
          const supabaseUrl = getSupabaseUrl();
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseClient = createClient(supabaseUrl, getSupabasePublishableKey());
          // Send a broadcast to notify teachers of the completion
          const channel = supabaseClient.channel('assignment-completion-alerts');
          await channel.send({
            type: 'broadcast',
            event: 'assignment-completed',
            payload: {
              assignmentId: assignmentId,
              studentId: studentData?.id,
              studentName: studentData?.name,
              completedAt: new Date().toISOString(),
              score: typeof score === 'number' ? score : 100
            }
          });
          console.log('📡 Broadcast sent to notify teachers');
        } catch (broadcastError) {
          console.warn('⚠️ Failed to send completion broadcast:', broadcastError);
        }
      } else {
        console.log('⚠️ Assignment completion may not be synced to teacher dashboard');
        toast.error('❌ Assignment completion failed to save to database - please try again or contact your teacher', { duration: 8000 });
      }
    }
  };

  const playGame = (assignment: any) => {
    console.log('🎮 playGame called with assignment:', assignment);
    
    if (assignment.assignment_type === 'game') {
      // Handle both cases: with games object and without
      const gameName = assignment.games?.name || assignment.title || 'Game';
      // Fallback order: assignment.game_type, games.game_type, 'word-scramble'
      const gameType = assignment.game_type || assignment.games?.game_type || 'word-scramble';

      setCurrentGame({
        id: assignment.game_id || assignment.id,
        name: gameName,
        game_type: gameType,
        game_path: assignment.games?.game_path || '',
        categories: assignment.games?.categories || [],
        skills: assignment.games?.skills || [],
        config: assignment.game_config,
        assignmentTitle: assignment.title,
        assignmentId: assignment.id
      });
      // Reset game completion state for new game
      setGameCompleted(false);
      setGameScore(0);
      setShowGameModal(true);
      toast.success(`Starting ${gameName}!`);
    } else {
      toast.error('This assignment is not a game');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No access token provided. Please use the link provided by your teacher.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    console.error('Error loading student data:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error || 'Failed to load student data'}</p>
            <p className="mt-2 text-sm text-gray-600">
              Please contact your teacher if this problem persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome, {studentData.name}! 👋</h1>
                <p className="text-sm text-gray-600">{studentData.email || 'Student Portal'}</p>
              </div>
            </div>
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Refreshing...</span>
              </div>
            )}
            
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* My Rooms Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Classroom{studentData.rooms.length > 1 ? 's' : ''}</h2>
          </div>

          {studentData.rooms.length === 0 ? (
            <Alert>
              <AlertDescription>
                You haven't been assigned to any classrooms yet. Please contact your teacher.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {studentData.rooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    {room.grade_level && (
                      <Badge variant="secondary" className="w-fit">
                        Grade {room.grade_level}
                      </Badge>
                    )}
                    <CardDescription>{room.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {studentData.assignments.filter(a => a.room_id === room.id).length} assignment(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* My Assignments Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
          </div>

          {studentData.assignments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No assignments yet. Check back later!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {studentData.assignments.map((assignment) => {
                // Debug assignment structure
                if (assignment.assignment_type === 'game') {
                  console.log('🎮 Game Assignment:', {
                    id: assignment.id,
                    title: assignment.title,
                    assignment_type: assignment.assignment_type,
                    game_id: assignment.games?.id,
                    games: assignment.games,
                    game_config: assignment.game_config
                  });
                }
                
                const room = studentData.rooms.find(r => r.id === assignment.room_id);
                const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
                const isOverdue = dueDate && dueDate < new Date();

                return (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {room?.name && (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Home className="h-3 w-3" />
                                {room.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={assignment.status === 'active' ? 'default' : 'secondary'}
                          className={isOverdue ? 'bg-red-100 text-red-700 border-red-200' : ''}
                        >
                          {isOverdue ? 'Overdue' : assignment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-3">
                        {assignment.description || 'No description provided'}
                      </p>

                      {/* Assignment Type and Question Paper Badge */}
                      {(assignment.assignment_type || assignment.question_paper_id || assignment.grade) && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {assignment.assignment_type && (
                            <Badge variant="outline" className="text-xs">
                              {assignment.assignment_type === 'custom' && '📝 Custom Assignment'}
                              {assignment.assignment_type === 'game' && '🎮 Game Assignment'}
                              {assignment.assignment_type !== 'custom' && assignment.assignment_type !== 'game' && assignment.assignment_type}
                            </Badge>
                          )}
                          {assignment.question_paper_id && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                              📄 Question Paper
                            </Badge>
                          )}
                          {assignment.grade && (
                            <Badge variant="outline" className="text-xs">
                              Grade {assignment.grade}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Game Information */}
                      {assignment.assignment_type === 'game' && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Gamepad2 className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              {assignment.games?.name || 'Interactive Game Activity'}
                            </span>
                          </div>
                          {assignment.game_config && (
                            <div className="text-xs text-blue-700">
                              <span>Difficulty: </span>
                              <Badge variant="outline" className="text-xs">
                                {assignment.game_config.difficulty === 'easy' && '🟢 Easy'}
                                {assignment.game_config.difficulty === 'medium' && '🟡 Medium'}
                                {assignment.game_config.difficulty === 'hard' && '🔴 Hard'}
                              </Badge>
                              {assignment.game_config.category && (
                                <>
                                  <span className="ml-2">Category: </span>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.game_config.category}
                                  </Badge>
                                </>
                              )}
                            </div>
                          )}
                          {assignment.games?.skills && (
                            <div className="flex gap-1 mt-2">
                              {assignment.games.skills.slice(0, 3).map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {dueDate && (
                            <>
                              <Calendar className="h-4 w-4" />
                              <span>Due: {dueDate.toLocaleDateString()}</span>
                              <Clock className="h-4 w-4 ml-2" />
                              <span>{dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Assignment Action Buttons */}
                        <div className="flex gap-2">
                          {(() => {
                            const attempt = assignmentAttempts[assignment.id];
                            const isLoading = loadingAttempts[assignment.id];
                            
                            // Debug log to see what's happening
                            console.log(`Assignment ${assignment.id} attempt:`, attempt);
                            
                            // Check for submitted/completed status FIRST
                            if (attempt && (attempt.status === 'completed' || attempt.status === 'submitted')) {
                              let aiSubmissionId =
                                attempt.ai_submission_id ||
                                attempt.submission_data?.ai_submission_id ||
                                attempt.submission_data?.submissionId ||
                                attempt.submission_data?.submission_id ||
                                null;
                              if (!aiSubmissionId) {
                                try {
                                  const raw = localStorage.getItem('student_ai_submission_map');
                                  const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
                                  aiSubmissionId = map[assignment.id] || null;
                                } catch {
                                  aiSubmissionId = null;
                                }
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    ✅ Submitted {attempt.score !== undefined ? `(${attempt.score}%)` : ''}
                                  </Badge>
                                  {aiSubmissionId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        window.location.href = `/student/feedback/${aiSubmissionId}`;
                                      }}
                                    >
                                      View AI Feedback
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      resubmitHandledRef.current = true;
                                      if (attempt) {
                                        resubmitAttemptSnapshotRef.current[assignment.id] = attempt;
                                      }
                                      if (assignment.assignment_type === 'game') {
                                        startAssignment(assignment.id)
                                          .catch((error) => {
                                            console.warn('Failed to record game resubmit attempt:', error);
                                          })
                                          .finally(() => {
                                            playGame(assignment);
                                          });
                                      } else if (assignment.question_paper_id) {
                                        startAssignmentWithQuestionPaper(assignment);
                                      } else {
                                        startAssignment(assignment.id);
                                      }
                                    }}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                                        Resubmitting...
                                      </>
                                    ) : (
                                      'Resubmit'
                                    )}
                                  </Button>
                                </div>
                              );
                            }
                            
                            if (attempt && attempt.status === 'in_progress') {
                              // DEBUG: Check assignment structure for games
                              console.log('🎮 DEBUG: Assignment in progress:', {
                                id: assignment.id,
                                title: assignment.title,
                                assignment_type: assignment.assignment_type,
                                question_paper_id: assignment.question_paper_id,
                                games: assignment.games,
                                game_id: assignment.games?.id
                              });
                              
                              return (
                                <>
                                  {assignment.assignment_type === 'game' && (
                                    <Button 
                                      onClick={() => {
                                        console.log('🎮 Continue Game clicked:', assignment.id);
                                        playGame(assignment);
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      size="sm"
                                    >
                                      <Play className="h-4 w-4 mr-1" />
                                      Continue Game
                                    </Button>
                                  )}
                                  {assignment.question_paper_id && (
                                    <Button 
                                      onClick={() => {
                                        console.log('📄 Continue Question Paper clicked:', assignment.id);
                                        // For in-progress assignments, also load and show the question paper
                                        startAssignmentWithQuestionPaper(assignment);
                                      }}
                                      className="bg-orange-600 hover:bg-orange-700 text-white"
                                      size="sm"
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      Continue Question Paper
                                    </Button>
                                  )}
                                  {(!assignment.assignment_type || (assignment.assignment_type === 'custom' && !assignment.question_paper_id)) && (
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        completeAssignment(assignment.id);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      disabled={isLoading}
                                    >
                                      {isLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                      )}
                                      Submit
                                    </Button>
                                  )}
                                </>
                              );
                            }
                            
                            // Default: not started or no attempt record
                            return (
                              <Button 
                                onClick={(e) => {
                                  // FIX 2: Prevent event propagation to avoid bubbling to parent elements
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // ULTRA DEBUG - Log everything about this assignment
                                  console.log('╔══════════════════════════════════════════════╗');
                                  console.log('║  🔘 START ASSIGNMENT BUTTON CLICKED          ║');
                                  console.log('╚══════════════════════════════════════════════╝');
                                  console.log('Assignment Object:', assignment);
                                  console.log('Assignment ID:', assignment.id);
                                  console.log('Assignment Title:', assignment.title);
                                  console.log('Assignment Type:', assignment.assignment_type);
                                  console.log('Question Paper ID:', assignment.question_paper_id);
                                  console.log('Has Question Paper?:', !!assignment.question_paper_id);
                                  console.log('Type of question_paper_id:', typeof assignment.question_paper_id);
                                  console.log('question_paper_id === null?:', assignment.question_paper_id === null);
                                  console.log('question_paper_id === undefined?:', assignment.question_paper_id === undefined);
                                  console.log('question_paper_id truthy?:', !!assignment.question_paper_id);
                                  
                                  // DECISION TREE - Explicit logging
                                  console.log('\n🔍 DECISION MAKING:');
                                  if (assignment.question_paper_id) {
                                    console.log('✅ CONDITION MET: assignment.question_paper_id EXISTS');
                                    console.log('➡️  CALLING: startAssignmentWithQuestionPaper()');
                                    console.log('➡️  THIS SHOULD OPEN THE MODAL!');
                                    startAssignmentWithQuestionPaper(assignment);
                                  } else if (assignment.assignment_type === 'game') {
                                    console.log('❌ CONDITION NOT MET: question_paper_id is NULL/undefined');
                                    console.log('✅ CONDITION MET: assignment_type === "game"');
                                    console.log('➡️  CALLING: startAssignment() - GAME MODE');
                                    startAssignment(assignment.id);
                                  } else {
                                    console.log('❌ CONDITION NOT MET: question_paper_id is NULL/undefined');
                                    console.log('❌ CONDITION NOT MET: not a game assignment');
                                    console.log('➡️  CALLING: startAssignment() - STANDARD MODE');
                                    console.log('➡️  THIS WILL ONLY SHOW TOAST, NO MODAL!');
                                    console.log('🚨 IF YOU EXPECTED A MODAL: question_paper_id is MISSING in database!');
                                    startAssignment(assignment.id);
                                  }
                                  console.log('╚══════════════════════════════════════════════╝\n');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                ) : (
                                  <Play className="h-4 w-4 mr-1" />
                                )}
                                Start Assignment
                              </Button>
                            );
                          })()} 
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* My Classmates Section */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Classmates</h2>
          </div>

          {!studentData.classmates || studentData.classmates.length === 0 ? (
            <Alert>
              <AlertDescription>
                No other students in your classrooms yet.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {studentData.classmates.map((classmate) => (
                <Card key={classmate.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{classmate.name}</CardTitle>
                        {classmate.email && (
                          <CardDescription className="text-xs truncate">
                            {classmate.email}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {classmate.primary_language && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Language:</span>
                          <span>{classmate.primary_language}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Shared classrooms:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {classmate.rooms.map((room) => (
                            <Badge key={room.id} variant="secondary" className="text-xs">
                              {room.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Help Section */}
        <section className="mt-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                If you have any questions about your assignments or need assistance, please contact your teacher.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Game Modal */}
      <Dialog
        open={showGameModal}
        onOpenChange={(open) => {
          if (!open) {
            restoreResubmitAttemptIfNeeded(currentGame?.assignmentId);
          }
          setShowGameModal(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-blue-600" />
              {currentGame?.name} - {currentGame?.assignmentTitle}
            </DialogTitle>
            <div className="text-sm text-gray-600">
              Complete the game activities to finish your assignment
            </div>
          </DialogHeader>
          
          {currentGame && (
            <div className="p-6">
              {/* Game Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                <h3 className="font-semibold mb-2">Game Configuration</h3>
                <div className="flex gap-4 text-sm">
                  <span>
                    <strong>Difficulty:</strong> 
                    <Badge variant="outline" className="ml-1">
                      {currentGame.config?.difficulty === 'easy' && '🟢 Easy'}
                      {currentGame.config?.difficulty === 'medium' && '🟡 Medium'}
                      {currentGame.config?.difficulty === 'hard' && '🔴 Hard'}
                    </Badge>
                  </span>
                  {currentGame.config?.category && (
                    <span>
                      <strong>Category:</strong> 
                      <Badge variant="outline" className="ml-1">{currentGame.config.category}</Badge>
                    </span>
                  )}
                </div>
                {currentGame.skills && (
                  <div className="mt-2">
                    <strong>Skills:</strong>
                    <div className="flex gap-1 mt-1">
                      {currentGame.skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Game Interface */}
              <div className="bg-white border-2 border-gray-200 rounded-lg min-h-[400px] flex items-center justify-center">
                {/* Robust config fallback for each game type */}
                {(() => {
                  const config = currentGame.config || {};
                  // Fallbacks for each game type
                  if (currentGame.game_type === 'word-scramble') {
                    let questions = [];
                    if (Array.isArray(config.questions)) questions = config.questions;
                    else if (Array.isArray(config)) questions = config;
                    // fallback: try config.defaultQuestions or provide demo
                    if (!questions.length && config.defaultQuestions) questions = config.defaultQuestions;
                    if (!questions.length) {
                      questions = [
                        { scrambled: 'PPAEL', answer: 'APPLE' },
                        { scrambled: 'NABANA', answer: 'BANANA' },
                        { scrambled: 'GRENARO', answer: 'ORANGE' },
                        { scrambled: 'EAPCH', answer: 'PEACH' },
                        { scrambled: 'YRRBESRTWA', answer: 'STRAWBERRY' },
                      ];
                    }
                    return <WordScrambleGame config={{ questions: questions.slice(0, 5) }} onComplete={(score) => { setGameCompleted(true); setGameScore(score); }} />;
                  }
                  if (currentGame.game_type === 'emoji-guess') {
                    let puzzles = [];
                    if (Array.isArray(config.puzzles)) puzzles = config.puzzles;
                    else if (Array.isArray(config)) puzzles = config;
                    if (!puzzles.length && config.defaultPuzzles) puzzles = config.defaultPuzzles;
                    if (!puzzles.length) {
                      puzzles = [
                        { emojis: '🍏📱', answers: ['Apple'] },
                        { emojis: '🍌🐒', answers: ['Banana'] },
                        { emojis: '🍕🏠', answers: ['Pizza Hut'] },
                        { emojis: '🌧️☔', answers: ['Rain', 'Rainy'] },
                        { emojis: '🐝🍯', answers: ['Honeybee', 'Bee'] },
                      ];
                    }
                    return <EmojiGuessGame config={{ puzzles: puzzles.slice(0, 5) }} onComplete={(score) => { setGameCompleted(true); setGameScore(score); }} />;
                  }
                  if (currentGame.game_type === 'riddle') {
                    let riddles = [];
                    if (Array.isArray(config.riddles)) riddles = config.riddles;
                    else if (Array.isArray(config)) riddles = config;
                    if (!riddles.length && config.defaultRiddles) riddles = config.defaultRiddles;
                    if (!riddles.length) {
                      riddles = [
                        { question: 'What has keys but can’t open locks?', answers: ['Piano', 'Keyboard'] },
                        { question: 'What has a face and two hands but no arms or legs?', answers: ['Clock'] },
                        { question: 'What gets wetter as it dries?', answers: ['Towel'] },
                        { question: 'What has a neck but no head?', answers: ['Bottle'] },
                        { question: 'What has to be broken before you can use it?', answers: ['Egg'] },
                      ];
                    }
                    return <RiddleGame config={{ riddles: riddles.slice(0, 5) }} onComplete={(score) => { setGameCompleted(true); setGameScore(score); }} />;
                  }
                  if (currentGame.game_type === 'crossword') {
                    let clues = [];
                    if (Array.isArray(config.clues)) clues = config.clues;
                    else if (Array.isArray(config)) clues = config;
                    if (!clues.length && config.defaultClues) clues = config.defaultClues;
                    if (!clues.length) {
                      clues = [
                        { clue: 'A yellow fruit, monkeys love it', answer: 'BANANA' },
                        { clue: 'Red fruit, keeps the doctor away', answer: 'APPLE' },
                        { clue: 'Orange citrus fruit', answer: 'ORANGE' },
                        { clue: 'Small, red, heart-shaped fruit', answer: 'CHERRY' },
                        { clue: 'King of the jungle', answer: 'LION' },
                      ];
                    }
                    return <CrosswordGame config={{ clues: clues.slice(0, 5) }} onComplete={(score) => { setGameCompleted(true); setGameScore(score); }} />;
                  }
                  // Default fallback
                  return (
                    <div className="text-center p-8">
                      <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {currentGame.name}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Game interface coming soon!
                      </p>
                      <Button 
                        onClick={(e) => {
                          // FIX 2: Prevent event propagation
                          e.preventDefault();
                          e.stopPropagation();
                          restoreResubmitAttemptIfNeeded(currentGame?.assignmentId);
                          setShowGameModal(false);
                        }}
                        variant="outline"
                      >
                        Close Game
                      </Button>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 flex justify-between">
                <Button 
                  onClick={(e) => {
                    // FIX 2: Prevent event propagation
                    e.preventDefault();
                    e.stopPropagation();
                    restoreResubmitAttemptIfNeeded(currentGame?.assignmentId);
                    setShowGameModal(false);
                  }}
                  variant="outline"
                >
                  Close Game
                </Button>
                <Button 
                  onClick={(e) => {
                    // FIX 2: Prevent event propagation
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (currentGame?.assignmentId) {
                      // If not completed, treat as wrong answer (score 0)
                      const scoreToSubmit = gameCompleted ? gameScore : 0;
                      completeAssignment(currentGame.assignmentId, scoreToSubmit, { 
                        gameType: currentGame.game_type,
                        difficulty: currentGame.config?.difficulty,
                        category: currentGame.config?.category,
                        completedAt: new Date().toISOString(),
                        forcedSubmit: !gameCompleted
                      });
                      setShowGameModal(false);
                    } else {
                      toast.error('Unable to submit assignment');
                    }
                  }}
                  className={gameCompleted 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-yellow-500 hover:bg-yellow-600'}
                >
                  {gameCompleted ? `Submit Assignment (${gameScore}%)` : 'Submit Anyway (Score: 0%)'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question Paper Modal */}
      <Dialog open={showQuestionPaperModal} onOpenChange={handleQuestionPaperModalChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {currentQuestionPaper?.title || 'Question Paper'}
            </DialogTitle>
            {currentQuestionPaper?.description && (
              <div className="text-sm text-gray-600 mt-2">
                {currentQuestionPaper.description}
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <Badge variant="secondary">
                {currentQuestionPaper?.questions?.length || 0} Questions
              </Badge>
              <Badge variant="secondary">
                Total Marks: {currentQuestionPaper?.questions?.reduce((sum: number, q: any) => sum + (q.marks || 1), 0) || 0}
              </Badge>
            </div>
          </DialogHeader>

          {loadingQuestionPaper ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading question paper...</span>
            </div>
          ) : currentQuestionPaper && currentQuestionPaper.questions ? (
            <div className="space-y-6 py-4">
              {currentQuestionPaper.questions.map((question: any, idx: number) => (
                <Card key={idx} className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600 text-white">Q{idx + 1}</Badge>
                          <Badge variant="outline">{question.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}</Badge>
                          <Badge variant="secondary">{question.marks || 1} {question.marks === 1 ? 'mark' : 'marks'}</Badge>
                        </div>
                        <p className="text-base font-semibold text-gray-800 leading-relaxed">
                          {question.text}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {question.type === 'multiple-choice' && question.options ? (
                      <div className="space-y-2">
                        {question.options.map((option: string, optionIdx: number) => (
                          <label
                            key={optionIdx}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              questionPaperAnswers[idx] === optionIdx
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${idx}`}
                              value={optionIdx}
                              checked={questionPaperAnswers[idx] === optionIdx}
                              onChange={() => handleQuestionPaperAnswerChange(idx, optionIdx)}
                              className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-700">
                              {String.fromCharCode(65 + optionIdx)}.
                            </span>
                            <span className="text-gray-800">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Your Answer:
                        </label>
                        <RichTextEditor
                          value={String(questionPaperAnswers[idx] || '')}
                          onChange={(value) => handleQuestionPaperAnswerChange(idx, value)}
                          placeholder="Type your answer here..."
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            id={`attachment-${idx}`}
                            type="file"
                            accept="image/*,text/plain,application/pdf"
                            className="hidden"
                            onChange={(event) => handleQuestionPaperAttachmentChange(idx, event.target.files?.[0] || null)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`attachment-${idx}`)?.click()}
                          >
                            Upload file
                          </Button>
                          {questionPaperAttachments[idx] && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>{questionPaperAttachments[idx]?.name}</span>
                              <button
                                type="button"
                                onClick={() => handleQuestionPaperAttachmentChange(idx, null)}
                                className="text-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          * Subjective answers will be reviewed by your teacher
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Progress indicator */}
              <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 -mx-6 -mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">
                      {Object.keys(questionPaperAnswers).length}
                    </span>
                    {' / '}
                    {currentQuestionPaper.questions.length} questions answered
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      const hasTextAnswer = Object.values(questionPaperAnswers).some((answer) => {
                        if (typeof answer === 'string') return stripHtml(answer).trim().length > 0;
                        return typeof answer === 'number';
                      });
                      const hasAttachment = Object.values(questionPaperAttachments).some(Boolean);
                      const allAttachmentsReady = Object.entries(questionPaperAttachments).every(([key, file]) => {
                        if (!file) return true;
                        const idx = Number(key);
                        return questionPaperAttachmentReady[idx] === true;
                      });
                      const isSubmittable = (hasTextAnswer || hasAttachment) && allAttachmentsReady;
                      return (
                        <>
                    <Button
                      onClick={(e) => {
                        // FIX 2: Prevent event propagation
                        e.preventDefault();
                        e.stopPropagation();

                        restoreResubmitAttemptIfNeeded(currentQuestionPaper?.assignment?.id);
                        
                        setShowQuestionPaperModal(false);
                        setCurrentQuestionPaper(null);
                        setQuestionPaperAnswers({});
                        setQuestionPaperAttachments({});
                        setQuestionPaperAttachmentReady({});
                      }}
                      variant="outline"
                      disabled={isSubmittingQuestionPaper}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={(e) => {
                        // FIX 2: Prevent event propagation
                        e.preventDefault();
                        e.stopPropagation();
                        submitQuestionPaper();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!isSubmittable || isSubmittingQuestionPaper}
                    >
                      {isSubmittingQuestionPaper ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Assignment
                        </>
                      )}
                    </Button>
                    {!isSubmittable && hasAttachment && !allAttachmentsReady && (
                      <span className="text-xs text-gray-500 self-center">Processing file...</span>
                    )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {isSubmittingQuestionPaper ? (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${submissionProgress}%` }}
                    ></div>
                  </div>
                ) : (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(Object.keys(questionPaperAnswers).length / currentQuestionPaper.questions.length) * 100}%`
                      }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No questions available in this paper</p>
              <Button
                onClick={(e) => {
                  // FIX 2: Prevent event propagation
                  e.preventDefault();
                  e.stopPropagation();
                  
                  setShowQuestionPaperModal(false);
                  setQuestionPaperAnswers({});
                  setQuestionPaperAttachments({});
                  setQuestionPaperAttachmentReady({});
                  setCurrentQuestionPaper(null);
                }}
                variant="outline"
                className="mt-4"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentPortalPage;
