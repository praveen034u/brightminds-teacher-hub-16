import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Sparkles, Plus, Trash2, Eye, Save, Image as ImageIcon, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { generateQuestions } from '@/api/llmQuestionBank';
import { supabase } from '@/config/supabase';
import Tesseract from 'tesseract.js';

interface Question {
  id: number;
  text: string;
  type: 'multiple-choice' | 'subjective';
  options?: string[];
  answer?: number | string;
  marks?: number;
  complexity: 'easy' | 'medium' | 'hard';
}

interface QuestionPaperBuilderProps {
  auth0UserId: string;
  onSave?: (paperData: any) => void;
  existingPaper?: any;
  isEditMode?: boolean;
  initialData?: {
    title?: string;
    description?: string;
    questions?: Question[];
  };
}

export const QuestionPaperBuilder: React.FC<QuestionPaperBuilderProps> = ({
  auth0UserId,
  onSave,
  existingPaper,
  isEditMode = false,
  initialData
}) => {
  // Question Paper State - Initialize with existing paper data if in edit mode
  const [paperTitle, setPaperTitle] = useState(
    existingPaper?.title || initialData?.title || ''
  );
  const [paperDescription, setPaperDescription] = useState(
    existingPaper?.description || initialData?.description || ''
  );
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'subjective'>('multiple-choice');
  const [complexity, setComplexity] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<Question[]>(
    existingPaper?.questions || initialData?.questions || []
  );
  
  // Manual Question Entry State
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newAnswer, setNewAnswer] = useState(-1);
  const [newMarks, setNewMarks] = useState('1');
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('');
  
  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  
  // AI Generation State
  const [llmSubject, setLlmSubject] = useState('');
  const [llmGrade, setLlmGrade] = useState('');
  const [llmComplexity, setLlmComplexity] = useState('medium');
  const [llmCount, setLlmCount] = useState(5);
  const [llmType, setLlmType] = useState('multiple-choice');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState('');
  const [llmGeneratedQuestions, setLlmGeneratedQuestions] = useState<any[]>([]);

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadedFiles(prev => [...prev, ...fileArray]);
    
    toast.info('Files uploaded. Click "Extract Questions" to process.');
  };

  // Extract Questions from Files (Enhanced OCR implementation)
  const handleExtractQuestions = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload files first');
      return;
    }

    setIsExtracting(true);
    setLlmError('');
    setExtractedText('');
    setExtractedQuestions([]);

    try {
      toast.info('Processing files with OCR... This may take a moment.');
      
      let allExtractedText = '';
      let processedCount = 0;
      
      // Process each uploaded file
      for (const file of uploadedFiles) {
        const fileType = file.type;
        
        // Check if it's an image file
        if (fileType.startsWith('image/')) {
          try {
            console.log(`Processing image ${processedCount + 1}/${uploadedFiles.length}: ${file.name}`);
            
            // Perform OCR on the image with enhanced settings
            const result = await Tesseract.recognize(file, 'eng', {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  const progress = Math.round(m.progress * 100);
                  console.log(`OCR Progress (${file.name}): ${progress}%`);
                }
              },
              // Enhanced OCR settings for better accuracy
              tessedit_pageseg_mode: Tesseract.PSM.AUTO,
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:?!()[]{}+-=*/\'"@ ',
            });
            
            let extractedTextFromImage = result.data.text;
            
            // Post-process OCR output for better formatting
            extractedTextFromImage = cleanOCRText(extractedTextFromImage);
            
            console.log(`Extracted text from ${file.name}:`, extractedTextFromImage);
            
            if (extractedTextFromImage.trim()) {
              allExtractedText += (allExtractedText ? '\n\n' : '') + extractedTextFromImage;
              processedCount++;
            }
            
          } catch (ocrError) {
            console.error(`OCR failed for ${file.name}:`, ocrError);
            toast.error(`Failed to extract text from ${file.name}`);
          }
        } else if (fileType === 'application/pdf') {
          // For PDFs, show a message that they need to use AI generation
          toast.info(`PDF files detected. Please use AI Generation tab with the context.`);
        } else {
          toast.warning(`Unsupported file type: ${file.name}`);
        }
      }
      
      if (allExtractedText.trim()) {
        setExtractedText(allExtractedText);
        
        // Try to parse questions from extracted text
        const parsedQuestions = parseQuestionsFromText(allExtractedText);
        
        if (parsedQuestions.length > 0) {
          setExtractedQuestions(parsedQuestions);
          toast.success(`Successfully extracted ${parsedQuestions.length} questions from ${processedCount} image(s)!`);
        } else {
          toast.info('Text extracted. Questions will appear below for manual review.');
        }
      } else {
        toast.warning('No text could be extracted from the uploaded files.');
      }
      
    } catch (error) {
      console.error('Error extracting questions:', error);
      toast.error('Failed to extract questions from files');
    } finally {
      setIsExtracting(false);
    }
  };

  // Helper function to clean OCR text
  const cleanOCRText = (text: string): string => {
    return text
      // Fix common OCR mistakes
      .replace(/\|/g, 'I') // Pipe to I
      .replace(/['']/g, "'") // Smart quotes to regular quotes
      .replace(/[""]/g, '"')
      // Fix option markers that OCR often messes up
      // "a1" → "a.", "b.0" → "b.", "c 2" → "c.", "d -1" → "d."
      .replace(/\b([a-d])\s*[1l]\s*/gi, '$1. ')
      .replace(/\b([a-d])\s*\.\s*[0Oo]\s*/gi, '$1. ')
      .replace(/\b([a-d])\s*[)]\s*[0-9]\s*/gi, '$1) ')
      .replace(/\b([a-d])\s+[0-9]/gi, '$1. ')
      // Fix spacing issues common in options
      .replace(/([a-d])([.)])\s*([0-9])/gi, '$1$2 $3')
      // Fix spacing around punctuation
      .replace(/\s+([.,;:?!)])/g, '$1')
      .replace(/([[(])\s+/g, '$1')
      // Normalize whitespace
      .replace(/[\t\r]/g, ' ')
      .replace(/[ ]+/g, ' ')
      // Fix line breaks - preserve question breaks
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove very short lines that are likely noise
        if (line.length < 3) return false;
        // Remove lines that are just special characters or numbers
        if (/^[^a-zA-Z0-9]+$/.test(line)) return false;
        // Remove standalone single characters
        if (/^[a-d]$/i.test(line)) return false;
        return true;
      })
      .join('\n')
      .trim();
  };

  // Helper function to parse questions from extracted text
  const parseQuestionsFromText = (text: string): Question[] => {
    const questions: Question[] = [];
    
    // First, let's clean and normalize the text
    let processedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    // Remove common header patterns from the entire text
    const headerPatterns = [
      /^.*?BRAINBOX.*?$/gim,
      /^.*?TUTORIALS.*?$/gim,
      /^.*?Sample paper.*?$/gim,
      /^.*?Class [IV]+.*?$/gim,
      /^.*?MATHEMATICS.*?$/gim,
      /^.*?Time:.*?$/gim,
      /^.*?F\.?M\.?\s*\d+.*?$/gim,
      /^.*?Section[-_][A-Z].*?$/gim,
      /^\s*\([0-9]+\s*x\s*[0-9]+\s*=\s*[0-9]+\)\s*$/gim,
      /^.*?b3.*?$/gim,
    ];
    
    headerPatterns.forEach(pattern => {
      processedText = processedText.replace(pattern, '');
    });
    
    // Clean up extra whitespace
    processedText = processedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    // Now parse questions - look for pattern: "number. question text"
    // The question might span multiple lines until we hit the next number or options
    const lines = processedText.split('\n');
    let currentQuestion: { num: string; text: string; hasOptions: boolean; optionsText: string } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Check if this line starts a new question (number followed by dot)
      const questionStartMatch = line.match(/^(\d+)\.\s*(.+)$/);
      
      if (questionStartMatch) {
        // Save previous question if exists
        if (currentQuestion) {
          processQuestion(currentQuestion, questions);
        }
        
        // Start new question
        const questionNum = questionStartMatch[1];
        const questionText = questionStartMatch[2];
        
        // Check if options are on the same line
        const hasInlineOptions = /\b[a-d][.)]\s*/.test(questionText);
        
        currentQuestion = {
          num: questionNum,
          text: questionText,
          hasOptions: hasInlineOptions,
          optionsText: hasInlineOptions ? questionText : ''
        };
      } else if (currentQuestion) {
        // This might be continuation of question or options
        const hasOptionsMarker = /\b[a-d][.)]\s*/.test(line);
        
        if (hasOptionsMarker && !currentQuestion.hasOptions) {
          // Options starting now
          currentQuestion.hasOptions = true;
          currentQuestion.optionsText = line;
        } else if (currentQuestion.hasOptions) {
          // More options
          currentQuestion.optionsText += ' ' + line;
        } else {
          // Part of question text
          currentQuestion.text += ' ' + line;
        }
      }
    }
    
    // Don't forget last question
    if (currentQuestion) {
      processQuestion(currentQuestion, questions);
    }
    
    return questions;
  };
  
  // Helper to process a parsed question
  const processQuestion = (
    qData: { num: string; text: string; hasOptions: boolean; optionsText: string },
    questions: Question[]
  ) => {
    if (qData.hasOptions) {
      // MCQ - separate question from options
      const fullText = qData.text;
      const firstOptionIdx = fullText.search(/\b[a-d][.)]\s*/i);
      
      let questionText = firstOptionIdx > 0 
        ? fullText.substring(0, firstOptionIdx).trim()
        : fullText.split(/\b[a-d][.)]/i)[0].trim();
      
      // Clean question text
      questionText = questionText
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract options from the options text
      const optionsToProcess = qData.optionsText || fullText.substring(firstOptionIdx);
      
      // More robust option extraction
      const options: string[] = [];
      const optionPattern = /\b([a-d])[.)]\s*([^a-d]*?)(?=\s*\b[a-d][.)]\s*|$)/gi;
      let match;
      
      while ((match = optionPattern.exec(optionsToProcess)) !== null) {
        let optText = match[2]?.trim() || '';
        // Clean the option
        optText = optText
          .replace(/^\s*[.)0]+\s*/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Filter out very short or empty options
        if (optText && optText.length > 0 && optText.length < 150) {
          options.push(optText);
        }
      }
      
      if (questionText && options.length >= 2) {
        questions.push({
          id: Date.now() + questions.length,
          text: questionText,
          type: 'multiple-choice',
          complexity: 'medium',
          marks: 1,
          options: options.slice(0, 4),
          answer: -1,
        });
      }
    } else {
      // Subjective question
      const cleanQuestion = qData.text
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanQuestion.length >= 10) {
        questions.push({
          id: Date.now() + questions.length,
          text: cleanQuestion,
          type: 'subjective',
          complexity: 'medium',
          marks: 1,
        });
      }
    }
  };

  // Enhanced function to extract MCQ question and options
  const extractMCQ = (text: string): { question: string; options: string[] } => {
    // Find where options start (first a. or a) )
    const optionsStartPattern = /[a-d][.)]\s*/i;
    const optionsStartMatch = text.search(optionsStartPattern);
    
    if (optionsStartMatch === -1) {
      return { question: text.trim(), options: [] };
    }
    
    // Split into question and options part
    const questionText = text.substring(0, optionsStartMatch).trim();
    const optionsText = text.substring(optionsStartMatch);
    
    // Extract options with better pattern matching
    const options: string[] = [];
    
    // Pattern to match: a. text b. text c. text d. text OR a) text b) text
    const optionPattern = /([a-d])[.)]\s*([^a-d]*?)(?=[a-d][.)]\s*|$)/gi;
    let match;
    
    while ((match = optionPattern.exec(optionsText)) !== null) {
      const optionText = match[2]
        ?.trim()
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .replace(/[^a-zA-Z0-9\s,.-]/g, '') // Remove special chars except basic punctuation
        .trim();
      
      if (optionText && optionText.length > 0) {
        options.push(optionText);
      }
    }
    
    // Ensure we have 4 options or at least 2
    const validOptions = options.slice(0, 4);
    
    return {
      question: questionText.replace(/\s+/g, ' ').trim(),
      options: validOptions.length >= 2 ? validOptions : []
    };
  };

  // Helper function to extract options from text (legacy support)
  const extractOptions = (text: string): string[] => {
    const options: string[] = [];
    const optionPattern = /([a-d])[.)]\s*([^a-d\n]+)/gi;
    const matches = text.matchAll(optionPattern);
    
    for (const match of matches) {
      const optionText = match[2]?.trim();
      if (optionText) {
        options.push(optionText);
      }
    }
    
    return options.slice(0, 4); // Limit to 4 options
  };

  // AI Question Generation
  const handleGenerateAIQuestions = async () => {
    if (!llmApiKey || !llmSubject || !llmGrade) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLlmError('');
    setLlmGeneratedQuestions([]);
    setLlmLoading(true);

    try {
      const { questions: generatedQuestions } = await generateQuestions({
        apiKey: llmApiKey,
        subject: llmSubject,
        grade: llmGrade,
        complexity: llmComplexity,
        count: llmCount,
        type: llmType
      });

      if (!generatedQuestions || generatedQuestions.length === 0) {
        setLlmError('No questions generated. Try adjusting parameters.');
      } else {
        setLlmGeneratedQuestions(generatedQuestions);
        toast.success(`Generated ${generatedQuestions.length} questions!`);
      }
    } catch (err: any) {
      setLlmError(err?.message || 'Failed to generate questions.');
      toast.error('Failed to generate questions');
    } finally {
      setLlmLoading(false);
    }
  };

  // Add Manual Question
  const handleAddManualQuestion = () => {
    if (!newQuestionText.trim()) {
      toast.error('Please enter question text');
      return;
    }

    const newQuestion: Question = {
      id: Date.now(),
      text: newQuestionText,
      type: questionType,
      complexity,
      marks: parseInt(newMarks) || 1,
    };

    if (questionType === 'multiple-choice') {
      if (newOptions.every(opt => !opt.trim())) {
        toast.error('Please provide at least one option');
        return;
      }
      if (newAnswer === -1) {
        toast.error('Please select the correct answer');
        return;
      }
      newQuestion.options = newOptions.filter(opt => opt.trim());
      newQuestion.answer = newAnswer;
    } else {
      newQuestion.answer = subjectiveAnswer;
    }

    setQuestions([...questions, newQuestion]);
    
    // Reset form
    setNewQuestionText('');
    setNewOptions(['', '', '', '']);
    setNewAnswer(-1);
    setSubjectiveAnswer('');
    setNewMarks('1');
    
    toast.success('Question added!');
  };

  // Import AI Generated Question
  const handleImportAIQuestion = (question: any, index: number) => {
    const importedQuestion: Question = {
      id: Date.now(),
      text: question.text,
      type: 'multiple-choice',
      options: question.options || [],
      answer: typeof question.answer === 'number' 
        ? question.answer 
        : (Array.isArray(question.options) ? question.options.findIndex(opt => opt === question.answer) : -1),
      complexity: llmComplexity as any,
      marks: 1
    };

    setQuestions([...questions, importedQuestion]);
    setLlmGeneratedQuestions(llmGeneratedQuestions.filter((_, i) => i !== index));
    toast.success('Question imported!');
  };

  // Import All AI Questions
  const handleImportAllAIQuestions = () => {
    const importedQuestions: Question[] = llmGeneratedQuestions.map((q, idx) => ({
      id: Date.now() + idx,
      text: q.text,
      type: 'multiple-choice',
      options: q.options || [],
      answer: typeof q.answer === 'number' 
        ? q.answer 
        : (Array.isArray(q.options) ? q.options.findIndex(opt => opt === q.answer) : -1),
      complexity: llmComplexity as any,
      marks: 1
    }));

    setQuestions([...questions, ...importedQuestions]);
    setLlmGeneratedQuestions([]);
    toast.success(`Imported ${importedQuestions.length} questions!`);
  };

  // Delete Question
  const handleDeleteQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.success('Question deleted');
  };

  // Save Question Paper to Database
  const handleSaveQuestionPaper = async () => {
    if (!paperTitle.trim()) {
      toast.error('Please enter a title for the question paper');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    try {
      const paperData = {
        teacher_id: auth0UserId,
        title: paperTitle,
        description: paperDescription,
        questions: questions,
        question_count: questions.length,
        total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        updated_at: new Date().toISOString()
      };

      if (isEditMode && existingPaper?.id) {
        // Update existing paper
        const { data, error } = await supabase
          .from('question_papers')
          .update(paperData)
          .eq('id', existingPaper.id)
          .eq('teacher_id', auth0UserId)
          .select()
          .single();

        if (error) throw error;

        toast.success('Question paper updated successfully!');
        
        // Update localStorage
        const existingPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
        const updatedPapers = existingPapers.map((p: any) => 
          p.id === existingPaper.id ? { ...paperData, id: existingPaper.id, created_at: p.created_at } : p
        );
        localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(updatedPapers));
      } else {
        // Create new paper
        const newPaperData = {
          ...paperData,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('question_papers')
          .insert([newPaperData])
          .select()
          .single();

        if (error) throw error;

        toast.success('Question paper saved successfully!');
        
        // Also save to localStorage as backup
        const existingPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
        localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify([
          { ...newPaperData, id: data?.id || `local_${Date.now()}` },
          ...existingPapers
        ]));
      }

      if (onSave) {
        onSave(paperData);
      }

      // Reset form only if not in edit mode
      if (!isEditMode) {
        setPaperTitle('');
        setPaperDescription('');
        setQuestions([]);
      }
      
    } catch (error: any) {
      console.error('Error saving question paper:', error);
      
      // Fallback to localStorage if Supabase fails
      try {
        if (isEditMode && existingPaper?.id) {
          // Update in localStorage
          const existingPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
          const updatedPapers = existingPapers.map((p: any) => 
            p.id === existingPaper.id ? {
              ...p,
              title: paperTitle,
              description: paperDescription,
              questions: questions,
              question_count: questions.length,
              total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
              updated_at: new Date().toISOString()
            } : p
          );
          localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(updatedPapers));
          toast.success('Question paper updated locally!');
        } else {
          // Create in localStorage
          const paperData = {
            id: `local_${Date.now()}`,
            teacher_id: auth0UserId,
            title: paperTitle,
            description: paperDescription,
            questions: questions,
            question_count: questions.length,
            total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const existingPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
          localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify([
            paperData,
            ...existingPapers
          ]));

          toast.success('Question paper saved locally!');
        }
        
        if (onSave) {
          onSave({ title: paperTitle, description: paperDescription, questions });
        }
      } catch (localError) {
        toast.error('Failed to save question paper');
      }
    }
  };

  // Preview/Print Question Paper
  const handlePreviewPaper = () => {
    if (questions.length === 0) {
      toast.error('No questions to preview');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${paperTitle || 'Question Paper'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              max-width: 800px;
            }
            h1 { 
              text-align: center; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .meta { 
              text-align: right; 
              font-size: 12px; 
              color: #666; 
              margin-bottom: 20px;
            }
            .description { 
              background: #f5f5f5; 
              padding: 10px; 
              margin-bottom: 20px; 
              border-left: 4px solid #007bff;
            }
            .question { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .question-number { 
              font-weight: bold; 
              color: #007bff;
            }
            .marks { 
              font-size: 12px; 
              color: #666; 
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              font-size: 11px;
              border-radius: 12px;
              margin-left: 8px;
            }
            .badge-easy { background: #d4edda; color: #155724; }
            .badge-medium { background: #fff3cd; color: #856404; }
            .badge-hard { background: #f8d7da; color: #721c24; }
            .options { 
              margin-left: 20px;
              list-style-type: none;
            }
            .options li { 
              padding: 5px 0;
            }
            .answer-space {
              margin-top: 10px;
              border-bottom: 1px solid #ddd;
              min-height: 60px;
            }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${paperTitle || 'Question Paper'}</h1>
          <div class="meta">
            Total Questions: ${questions.length} | Total Marks: ${questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
          </div>
          ${paperDescription ? `<div class="description"><strong>Instructions:</strong> ${paperDescription}</div>` : ''}
          
          ${questions.map((q, idx) => `
            <div class="question">
              <div class="question-header">
                <div>
                  <span class="question-number">Q${idx + 1}.</span>
                  <span class="badge badge-${q.complexity}">${q.complexity}</span>
                  <span class="badge">${q.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}</span>
                </div>
                <span class="marks">[${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
              </div>
              <div><strong>${q.text}</strong></div>
              ${q.type === 'multiple-choice' && q.options ? `
                <ul class="options">
                  ${q.options.map((opt, i) => `<li>${String.fromCharCode(97 + i)}) ${opt}</li>`).join('')}
                </ul>
              ` : `
                <div class="answer-space"></div>
              `}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Question Paper Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Paper Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="paperTitle">Question Paper Title *</Label>
              <Input
                id="paperTitle"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
                placeholder="e.g., Math Mid-Term Exam 2024"
              />
            </div>
            
            <div>
              <Label htmlFor="paperDescription">Instructions / Description</Label>
              <Input
                id="paperDescription"
                value={paperDescription}
                onChange={(e) => setPaperDescription(e.target.value)}
                placeholder="e.g., Answer all questions. Show your work."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Question Type</Label>
                <Select value={questionType} onValueChange={(value: any) => setQuestionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="subjective">Subjective</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Complexity</Label>
                <Select value={complexity} onValueChange={(value: any) => setComplexity(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Question Creation Methods */}
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Generation
              </TabsTrigger>
            </TabsList>

            {/* Upload Files Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <FileUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Upload Scanned Copies or PDFs</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload images (PNG, JPG) or PDF files containing questions
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Choose Files
                      </span>
                    </Button>
                  </label>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Uploaded Files:</div>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {file.name}
                          </div>
                        ))}
                      </div>
                      
                      <Button
                        onClick={handleExtractQuestions}
                        disabled={isExtracting}
                        className="mt-4"
                      >
                        {isExtracting ? 'Processing...' : 'Extract Questions'}
                      </Button>
                    </div>
                  )}

                  {extractedText && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg text-left">
                      <div className="text-sm font-medium text-green-900 mb-2">
                        ✓ Files Processed
                      </div>
                      <div className="text-xs text-green-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {extractedText}
                      </div>
                    </div>
                  )}

                  {extractedQuestions.length > 0 && (
                    <div className="mt-4 border rounded-lg p-4 bg-blue-50 text-left">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-blue-900">
                          Extracted Questions ({extractedQuestions.length})
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setQuestions([...questions, ...extractedQuestions]);
                            setExtractedQuestions([]);
                            toast.success(`Imported ${extractedQuestions.length} questions!`);
                          }}
                        >
                          Import All
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {extractedQuestions.map((q, idx) => (
                          <div key={q.id} className="bg-white p-3 rounded border">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600">Q{idx + 1}.</span>
                                <Badge variant="outline" className={
                                  q.complexity === 'easy' ? 'bg-green-50 text-green-700' :
                                  q.complexity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-red-50 text-red-700'
                                }>
                                  {q.complexity}
                                </Badge>
                                <Badge variant="outline">
                                  {q.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm mb-2">{q.text}</div>
                            {q.options && q.options.length > 0 && (
                              <ul className="text-xs space-y-1 ml-4">
                                {q.options.map((opt: string, i: number) => (
                                  <li key={i}>
                                    {String.fromCharCode(97 + i)}) {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                setQuestions([...questions, q]);
                                setExtractedQuestions(extractedQuestions.filter(eq => eq.id !== q.id));
                                toast.success('Question imported!');
                              }}
                            >
                              Import
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <Label htmlFor="questionText">Question Text *</Label>
                  <Input
                    id="questionText"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Enter your question..."
                    disabled={false}
                    readOnly={false}
                  />
                </div>

                {questionType === 'multiple-choice' ? (
                  <>
                    <div>
                      <Label>Options</Label>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => (
                          <Input
                            key={i}
                            id={`option-${i}`}
                            value={newOptions[i]}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[i] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            disabled={false}
                            readOnly={false}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Correct Answer</Label>
                      <Select value={newAnswer.toString()} onValueChange={(val) => setNewAnswer(parseInt(val))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">-- Select --</SelectItem>
                          {[0, 1, 2, 3].map(i => (
                            <SelectItem key={i} value={i.toString()}>
                              Option {String.fromCharCode(65 + i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div>
                    <Label htmlFor="subjectiveAnswer">Model Answer (Optional)</Label>
                    <Input
                      id="subjectiveAnswer"
                      value={subjectiveAnswer}
                      onChange={(e) => setSubjectiveAnswer(e.target.value)}
                      placeholder="Enter expected answer or key points..."
                      disabled={false}
                      readOnly={false}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newMarks">Marks</Label>
                    <Input
                      id="newMarks"
                      type="number"
                      min="1"
                      value={newMarks}
                      onChange={(e) => setNewMarks(e.target.value)}
                      disabled={false}
                      readOnly={false}
                    />
                  </div>
                  <div>
                    <Label>Complexity</Label>
                    <Select value={complexity} onValueChange={(value: any) => setComplexity(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddManualQuestion} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </TabsContent>

            {/* AI Generation Tab */}
            <TabsContent value="ai" className="space-y-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="llmSubject">Subject *</Label>
                    <Input
                      id="llmSubject"
                      value={llmSubject}
                      onChange={(e) => setLlmSubject(e.target.value)}
                      placeholder="e.g., Mathematics"
                      disabled={false}
                      readOnly={false}
                    />
                  </div>
                  <div>
                    <Label htmlFor="llmGrade">Grade Level *</Label>
                    <Input
                      id="llmGrade"
                      value={llmGrade}
                      onChange={(e) => setLlmGrade(e.target.value)}
                      placeholder="e.g., 5"
                      disabled={false}
                      readOnly={false}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Complexity</Label>
                    <Select value={llmComplexity} onValueChange={setLlmComplexity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="llmCount">Question Count</Label>
                    <Input
                      id="llmCount"
                      type="number"
                      min="1"
                      max="20"
                      value={llmCount}
                      onChange={(e) => setLlmCount(Number(e.target.value))}
                      disabled={false}
                      readOnly={false}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={llmType} onValueChange={setLlmType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="short-answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="llmApiKey">OpenAI API Key *</Label>
                  <Input
                    id="llmApiKey"
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={false}
                    readOnly={false}
                  />
                </div>

                <Button
                  onClick={handleGenerateAIQuestions}
                  disabled={llmLoading}
                  className="w-full"
                >
                  {llmLoading ? 'Generating...' : 'Generate Questions with AI'}
                </Button>

                {llmError && (
                  <div className="text-sm text-red-600">{llmError}</div>
                )}

                {llmGeneratedQuestions.length > 0 && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium">Generated Questions ({llmGeneratedQuestions.length})</span>
                      <Button size="sm" onClick={handleImportAllAIQuestions}>
                        Import All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {llmGeneratedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border">
                          <div className="font-medium text-sm mb-2">{q.text}</div>
                          {q.options && (
                            <ul className="text-xs space-y-1 ml-4">
                              {q.options.map((opt: string, i: number) => (
                                <li key={i} className={q.answer === i ? 'font-bold text-green-700' : ''}>
                                  {String.fromCharCode(97 + i)}) {opt}
                                </li>
                              ))}
                            </ul>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => handleImportAIQuestion(q, idx)}
                          >
                            Import
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">
                  Questions ({questions.length}) - Total Marks: {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                </h3>
                <Button size="sm" variant="outline" onClick={handlePreviewPaper}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">Q{idx + 1}.</span>
                        <Badge variant="outline" className={
                          q.complexity === 'easy' ? 'bg-green-50 text-green-700' :
                          q.complexity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }>
                          {q.complexity}
                        </Badge>
                        <Badge variant="outline">
                          {q.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}
                        </Badge>
                        <span className="text-xs text-gray-600">[{q.marks} mark{q.marks! > 1 ? 's' : ''}]</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    
                    <div className="font-medium text-sm mb-2">{q.text}</div>
                    
                    {q.type === 'multiple-choice' && q.options && (
                      <ul className="text-xs space-y-1 ml-4">
                        {q.options.map((opt, i) => (
                          <li key={i} className={q.answer === i ? 'font-bold text-green-700' : ''}>
                            {String.fromCharCode(97 + i)}) {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSaveQuestionPaper}
              disabled={!paperTitle.trim() || questions.length === 0}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? 'Update Question Paper' : 'Save Question Paper'}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreviewPaper}
              disabled={questions.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
